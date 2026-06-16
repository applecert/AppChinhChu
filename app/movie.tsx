import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Share,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  X,
  Search,
  Heart,
  Share2,
  Play,
  ChevronLeft,
  Film,
  Home,
  Menu,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Interface định nghĩa dữ liệu API phim
interface MovieItem {
  name: string;
  slug: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  quality: string;
  episode_current?: string;
}

interface MovieDetail {
  name: string;
  slug: string;
  origin_name: string;
  content: string;
  poster_url: string;
  thumb_url: string;
  director: string[];
  actor: string[];
  country: { name: string }[];
  duration: string;
  time: string;
  year: number;
  quality: string;
}

interface EpisodeItem {
  name: string;
  slug: string;
  link_embed: string;
}

const API_BASE = 'https://ophim1.com';
const IMG_BASE = 'https://img.ophim.live/uploads/movies';

export default function MovieScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();

  // Màn hình hiển thị: 'home' | 'detail' | 'grid'
  const [currentView, setCurrentView] = useState<'home' | 'detail' | 'grid'>('home');
  const [loading, setLoading] = useState(true);

  // Dữ liệu các hàng phim (Shelves)
  const [phimMoi, setPhimMoi] = useState<MovieItem[]>([]);
  const [hanhDong, setHanhDong] = useState<MovieItem[]>([]);
  const [phimLe, setPhimLe] = useState<MovieItem[]>([]);
  const [phimBo, setPhimBo] = useState<MovieItem[]>([]);
  const [vienTuong, setVienTuong] = useState<MovieItem[]>([]);
  const [tinhCam, setTinhCam] = useState<MovieItem[]>([]);
  const [kinhDi, setKinhDi] = useState<MovieItem[]>([]);
  const [hoatHinh, setHoatHinh] = useState<MovieItem[]>([]);

  // Carousel Hero Slider
  const [heroMovies, setHeroMovies] = useState<MovieItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Chi tiết phim đang mở
  const [currentMovie, setCurrentMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [detailActiveTab, setDetailActiveTab] = useState<'eps' | 'suggest' | 'gallery' | 'cast' | 'comment'>('eps');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [suggestedMovies, setSuggestedMovies] = useState<MovieItem[]>([]);

  // Xem phim
  const [isWatching, setIsWatching] = useState(false);
  const [isPlayingEmbed, setIsPlayingEmbed] = useState('');
  const [currentEpIndex, setCurrentEpIndex] = useState(-1);

  // Yêu thích & Tìm kiếm
  const [favorites, setFavorites] = useState<MovieItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [gridTitle, setGridTitle] = useState('Thư viện phim');

  // Bottom Floating Navigation
  const [navActiveTab, setNavActiveTab] = useState<'home' | 'lib' | 'fav'>('home');

  // Toast System
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Lịch sử duyệt màn hình trước đó (để quay lại đúng view)
  const viewHistory = useRef<'home' | 'grid'>('home');

  // Khởi tạo Toast
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 2000);
    });
  }, [toastOpacity]);

  // Các thuật toán điểm/phần trăm trùng khớp giả lập
  const getFakeRating = (slug: string) => {
    const charSum = slug.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return (7.2 + (charSum % 19) / 10).toFixed(1);
  };

  const getFakeMatch = (slug: string) => {
    const charSum = slug.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return (91 + (charSum % 9)) + '%';
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${IMG_BASE}/${url}`;
  };

  // Nạp API cơ bản
  const fetchAPI = async (endpoint: string) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      return await response.json();
    } catch (e) {
      console.warn('Lỗi fetch API:', endpoint, e);
      return null;
    }
  };

  // Tải dữ liệu trang chủ
  const initHomeData = async () => {
    setLoading(true);
    try {
      const [
        resMoi,
        resLe,
        resBo,
        resHH,
        resHD,
        resTC,
        resKD,
        resVT,
      ] = await Promise.all([
        fetchAPI('/v1/api/danh-sach/phim-moi-cap-nhat?page=1'),
        fetchAPI('/v1/api/danh-sach/phim-le?page=1'),
        fetchAPI('/v1/api/danh-sach/phim-bo?page=1'),
        fetchAPI('/v1/api/danh-sach/hoat-hinh?page=1'),
        fetchAPI('/v1/api/the-loai/hanh-dong?page=1'),
        fetchAPI('/v1/api/the-loai/tinh-cam?page=1'),
        fetchAPI('/v1/api/the-loai/kinh-di?page=1'),
        fetchAPI('/v1/api/the-loai/vien-tuong?page=1'),
      ]);

      if (resMoi?.data?.items) {
        setPhimMoi(resMoi.data.items);
        setHeroMovies(resMoi.data.items.slice(0, 5));
      }
      if (resLe?.data?.items) setPhimLe(resLe.data.items);
      if (resBo?.data?.items) setPhimBo(resBo.data.items);
      if (resHH?.data?.items) setHoatHinh(resHH.data.items);
      if (resHD?.data?.items) setHanhDong(resHD.data.items);
      if (resTC?.data?.items) setTinhCam(resTC.data.items);
      if (resKD?.data?.items) setKinhDi(resKD.data.items);
      if (resVT?.data?.items) setVienTuong(resVT.data.items);

    } catch (err) {
      showToast('Lỗi tải dữ liệu. Vui lòng kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Nạp Danh sách yêu thích từ AsyncStorage
  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('@ro_fav_native');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Lỗi nạp danh sách yêu thích:', e);
    }
  };

  // Bật/tắt lưu phim yêu thích
  const toggleFavorite = async (movie: MovieDetail | MovieItem) => {
    try {
      const isFav = favorites.some((f) => f.slug === movie.slug);
      let updated: MovieItem[] = [];
      if (isFav) {
        updated = favorites.filter((f) => f.slug !== movie.slug);
        showToast('Đã xóa khỏi danh sách yêu thích');
      } else {
        const item: MovieItem = {
          name: movie.name,
          slug: movie.slug,
          origin_name: movie.origin_name,
          poster_url: movie.poster_url,
          thumb_url: movie.thumb_url,
          year: movie.year,
          quality: movie.quality,
        };
        updated = [...favorites, item];
        showToast('Đã thêm vào danh sách yêu thích');
      }
      setFavorites(updated);
      await AsyncStorage.setItem('@ro_fav_native', JSON.stringify(updated));
    } catch (e) {
      showToast('Lỗi lưu yêu thích');
    }
  };

  // Chia sẻ phim
  const handleShare = async (movie: MovieDetail) => {
    try {
      await Share.share({
        title: movie.name,
        message: `Xem phim "${movie.name} (${movie.year})" cực hay tại RoPhim Cinema: https://ophim1.com/phim/${movie.slug}`,
      });
    } catch (error) {
      showToast('Đã sao chép link phim');
    }
  };

  // Xem chi tiết phim
  const openDetail = async (slug: string) => {
    setIsWatching(false);
    setIsPlayingEmbed('');
    setCurrentEpIndex(-1);
    setIsDescExpanded(false);
    setDetailActiveTab('eps');
    setCurrentMovie(null);
    setEpisodes([]);
    
    // Lưu lịch sử màn hình trước khi nhảy vào detail
    if (currentView !== 'detail') {
      viewHistory.current = currentView;
    }
    setCurrentView('detail');

    try {
      const data = await fetchAPI(`/phim/${slug}`);
      if (data?.movie) {
        setCurrentMovie(data.movie);
        if (data.episodes?.[0]?.server_data) {
          const listEps = data.episodes[0].server_data.map((ep: any) => ({
            name: ep.name,
            slug: ep.slug,
            link_embed: ep.link_embed,
          }));
          setEpisodes(listEps);
        }
        
        // Tải danh sách đề xuất tương tự
        const leRes = await fetchAPI('/v1/api/danh-sach/phim-le?page=1');
        if (leRes?.data?.items) {
          setSuggestedMovies(
            leRes.data.items.filter((m: any) => m.slug !== slug).slice(0, 9)
          );
        }
      }
    } catch (e) {
      showToast('Lỗi tải chi tiết phim');
    }
  };

  // Phát tập phim
  const playEpisode = (embedUrl: string, index: number) => {
    setIsWatching(true);
    setIsPlayingEmbed(embedUrl);
    setCurrentEpIndex(index);
  };

  // Tìm kiếm phim theo từ khóa
  const executeSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    setNavActiveTab('lib');
    setCurrentView('grid');
    setGridTitle(`Kết quả: ${keyword}`);
    setSearchResults([]);
    setLoading(true);

    try {
      const res = await fetchAPI(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
      if (res?.data?.items) {
        setSearchResults(res.data.items);
      }
    } catch (e) {
      showToast('Lỗi kết nối tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  // Lọc thể loại cuộn ngang
  const handleGenreSelect = async (genreName: string, path: string) => {
    setCurrentView('grid');
    setGridTitle(genreName);
    setSearchResults([]);
    setLoading(true);

    try {
      const res = await fetchAPI(path);
      if (res?.data?.items) {
        setSearchResults(res.data.items);
      }
    } catch (e) {
      showToast('Lỗi lọc thể loại');
    } finally {
      setLoading(false);
    }
  };

  // Mở thư viện toàn bộ phim
  const openLibrary = async () => {
    setNavActiveTab('lib');
    setCurrentView('grid');
    setGridTitle('Thư viện phim');
    setSearchResults([]);
    setLoading(true);

    try {
      const res = await fetchAPI('/v1/api/danh-sach/phim-moi-cap-nhat?page=1');
      if (res?.data?.items) {
        setSearchResults(res.data.items);
      }
    } catch (e) {
      showToast('Lỗi kết nối thư viện');
    } finally {
      setLoading(false);
    }
  };

  // Mở danh sách yêu thích
  const openWatchlist = () => {
    setNavActiveTab('fav');
    setCurrentView('grid');
    setGridTitle('Phim Yêu Thích');
  };

  // Khởi chạy khi mount
  useEffect(() => {
    initHomeData();
    loadFavorites();
  }, []);

  // Vòng lặp đổi Banner đề xuất tự động (6s)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (heroMovies.length > 0 && currentView === 'home' && isFocused) {
      interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % heroMovies.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [heroMovies, currentView, isFocused]);

  // Hiệu ứng mờ đổi ảnh khi heroIndex thay đổi
  useEffect(() => {
    if (heroMovies.length > 0) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [heroIndex, heroMovies]);

  // Ngắt WebView phát video khi mất focus
  useEffect(() => {
    if (!isFocused) {
      setIsWatching(false);
      setIsPlayingEmbed('');
      setCurrentEpIndex(-1);
    }
  }, [isFocused]);

  // ---- CÁC RENDERS THÀNH PHẦN ----

  // Header của ứng dụng
  const renderHeader = () => {
    const isDetailOrGrid = currentView === 'detail' || currentView === 'grid';
    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isDetailOrGrid ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (currentView === 'detail') {
                  setCurrentView(viewHistory.current);
                  if (viewHistory.current === 'home') {
                    setNavActiveTab('home');
                  } else {
                    setNavActiveTab('lib');
                  }
                } else if (currentView === 'grid') {
                  setCurrentView('home');
                  setNavActiveTab('home');
                }
                setIsWatching(false);
                setIsPlayingEmbed('');
              }}
            >
              <ChevronLeft color="#ffffff" size={24} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuButton} onPress={() => showToast('Menu tính năng đang được phát triển')}>
              <Menu color="#ffffff" size={20} strokeWidth={2.5} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => {
              setCurrentView('home');
              setNavActiveTab('home');
              setIsWatching(false);
              setIsPlayingEmbed('');
            }}
          >
            <View style={styles.logoBadge}>
              <Play color="#000000" size={10} fill="#000000" style={{ marginLeft: 1 }} />
            </View>
            <Text style={styles.logoText}>RoPhim</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
          <TouchableOpacity
            style={styles.searchHeaderButton}
            onPress={() => {
              setSearchKeyword('');
              showToast('Nhập từ khóa tìm kiếm và nhấn Enter');
            }}
          >
            <Search color="#ffffff" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Banner Đề xuất tự động (Hero Slider)
  const renderHeroSlider = () => {
    if (heroMovies.length === 0) return null;
    const movie = heroMovies[heroIndex];
    const rating = getFakeRating(movie.slug);

    return (
      <Animated.View style={[styles.heroSliderContainer, { opacity: fadeAnim }]}>
        <Image
          source={{ uri: getImageUrl(movie.thumb_url) }}
          style={styles.heroBackground}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(6, 7, 13, 0.4)', '#06070d']}
          style={styles.heroGradient}
        />
        <View style={styles.heroContent}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>ĐỀ XUẤT NỔI BẬT</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {movie.name}
          </Text>
          <Text style={styles.heroMeta}>
            ★ {rating} Rating  •  {movie.year}  •  {movie.quality || 'HD'}
          </Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.heroPlayBtn}
              onPress={() => openDetail(movie.slug)}
            >
              <Play color="#000000" size={14} fill="#000000" />
              <Text style={styles.heroPlayText}>Xem ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroDetailBtn}
              onPress={() => openDetail(movie.slug)}
            >
              <Text style={styles.heroDetailText}>Chi tiết phim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Thanh bộ lọc Thể loại cuộn ngang
  const renderGenreFilters = () => {
    const genres = [
      { name: 'Tất Cả', path: '/v1/api/danh-sach/phim-moi-cap-nhat?page=1' },
      { name: '💥 Hành Động', path: '/v1/api/the-loai/hanh-dong?page=1' },
      { name: '🛸 Viễn Tưởng', path: '/v1/api/the-loai/vien-tuong?page=1' },
      { name: '🍿 Chiếu Rạp', path: '/v1/api/danh-sach/phim-le?page=1' },
      { name: '👻 Kinh Dị', path: '/v1/api/the-loai/kinh-di?page=1' },
      { name: '❤️ Tình Cảm', path: '/v1/api/the-loai/tinh-cam?page=1' },
      { name: '🗡️ Cổ Trang', path: '/v1/api/the-loai/co-trang?page=1' },
    ];

    return (
      <View style={styles.genresWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genresScrollContent}>
          {genres.map((g, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.genrePill}
              onPress={() => handleGenreSelect(g.name.replace(/[^a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơư]/g, '').trim(), g.path)}
            >
              <Text style={styles.genrePillText}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render các hàng phim (Shelves)
  const renderMovieShelf = (title: string, items: MovieItem[], indicatorColor: string) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.shelfContainer}>
        <View style={styles.shelfHeader}>
          <View style={styles.shelfTitleContainer}>
            <View style={[styles.shelfIndicator, { backgroundColor: indicatorColor }]} />
            <Text style={styles.shelfTitle}>{title}</Text>
          </View>
          <TouchableOpacity onPress={() => handleGenreSelect(title, '/v1/api/danh-sach/phim-moi-cap-nhat?page=1')}>
            <Text style={styles.seeAllText}>XEM TOÀN BỘ &gt;</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => openDetail(item.slug)}
            >
              <View style={styles.cardImageContainer}>
                <Image
                  source={{ uri: getImageUrl(item.poster_url) }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  defaultSource={require('../assets/images/splash-icon.png')}
                />
                <View style={styles.cardQualityBadge}>
                  <Text style={styles.cardQualityText}>{item.quality || 'HD'}</Text>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.cardGradient}
                />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardMeta}>
                ★ {getFakeRating(item.slug)}  •  {item.year || 2024}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.shelfScrollContent}
        />
      </View>
    );
  };

  // Trang chủ (Home View)
  const renderHomeView = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffc837" />
          <Text style={styles.loadingText}>Đang tải dữ liệu phim...</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeScrollContent}>
        {renderHeroSlider()}
        {renderGenreFilters()}
        
        {/* Lần lượt render 8 Shelves phim */}
        {renderMovieShelf('Phim Mới Cập Nhật', phimMoi, '#ffc837')}
        {renderMovieShelf('Hành Động & Phiêu Lưu', hanhDong, '#e50914')}
        {renderMovieShelf('Phim Lẻ Thịnh Hành', phimLe, '#ff9f0a')}
        {renderMovieShelf('Phim Bộ Chọn Lọc', phimBo, '#0a84ff')}
        {renderMovieShelf('Viễn Tưởng Đặc Sắc', vienTuong, '#30d158')}
        {renderMovieShelf('Tình Cảm Lãng Mạn', tinhCam, '#bf5af2')}
        {renderMovieShelf('Kinh Dị Rùng Rợn', kinhDi, '#ff453a')}
        {renderMovieShelf('Hoạt Hình & Anime', hoatHinh, '#5e5ce6')}
      </ScrollView>
    );
  };

  // Giao diện Lưới danh sách phim (Grid View)
  const renderGridView = () => {
    const listData = gridTitle === 'Phim Yêu Thích' ? favorites : searchResults;

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffc837" />
          <Text style={styles.loadingText}>Đang tìm kiếm phim...</Text>
        </View>
      );
    }

    return (
      <View style={styles.gridContainer}>
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>{gridTitle}</Text>
        </View>

        <FlatList
          data={listData}
          keyExtractor={(item) => item.slug}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCardWrapper}
              activeOpacity={0.8}
              onPress={() => openDetail(item.slug)}
            >
              <View style={styles.gridCardImageContainer}>
                <Image
                  source={{ uri: getImageUrl(item.poster_url) }}
                  style={styles.gridCardImage}
                  resizeMode="cover"
                  defaultSource={require('../assets/images/splash-icon.png')}
                />
                <View style={styles.cardQualityBadge}>
                  <Text style={styles.cardQualityText}>{item.quality || 'HD'}</Text>
                </View>
              </View>
              <Text style={styles.gridCardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.gridCardMeta}>
                ★ {getFakeRating(item.slug)}  •  {item.year || 2024}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyGridContainer}>
              <AlertTriangle color="#8b8d99" size={32} />
              <Text style={styles.emptyGridText}>Không tìm thấy bộ phim nào phù hợp.</Text>
            </View>
          }
          contentContainerStyle={styles.gridScrollContent}
        />
      </View>
    );
  };

  // Màn hình Chi tiết phim (Detail View)
  const renderDetailView = () => {
    if (!currentMovie) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffc837" />
          <Text style={styles.loadingText}>Đang nạp thông tin phim...</Text>
        </View>
      );
    }

    const rating = getFakeRating(currentMovie.slug);
    const isFav = favorites.some((f) => f.slug === currentMovie.slug);

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
        {/* Media Container (16:9) */}
        <View style={styles.mediaContainer}>
          {isWatching ? (
            <WebView
              source={{ uri: isPlayingEmbed }}
              style={styles.playerWebView}
              allowsInlineMediaPlayback={true}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              backgroundColor="#000000"
            />
          ) : (
            <View style={styles.backdropPlaceholder}>
              <Image
                source={{ uri: getImageUrl(currentMovie.thumb_url) }}
                style={styles.backdropImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(6, 7, 13, 0.9)']}
                style={styles.backdropGradient}
              />
              <TouchableOpacity
                style={styles.nativePlayOverlayButton}
                activeOpacity={0.8}
                onPress={() => {
                  if (episodes.length > 0) {
                    playEpisode(episodes[0].link_embed, 0);
                  } else {
                    showToast('Đang cập nhật link tập phim');
                  }
                }}
              >
                <View style={styles.playOverlayCircle}>
                  <Play color="#000000" size={24} fill="#000000" style={{ marginLeft: 3 }} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Thông tin đầu đề */}
        {!isWatching && (
          <View style={styles.detailMetaHeader}>
            <Text style={styles.detailTitle}>{currentMovie.name}</Text>
            <Text style={styles.detailSubTitle}>{currentMovie.origin_name}</Text>
            
            <View style={styles.detailBadgesRow}>
              <View style={styles.detailImdbBadge}>
                <Text style={styles.detailImdbText}>★ {rating}</Text>
              </View>
              <Text style={styles.detailMetaText}>{currentMovie.year}</Text>
              <View style={styles.dotDivider} />
              <View style={styles.qualityBadgeBorder}>
                <Text style={styles.qualityBadgeTextBorder}>{currentMovie.quality}</Text>
              </View>
              <View style={styles.dotDivider} />
              <Text style={styles.detailMetaText} numberOfLines={1}>
                {currentMovie.country?.map((c) => c.name).join(', ')}
              </Text>
            </View>

            {/* Thông tin mô tả chi tiết cuộn */}
            <View style={styles.collapsibleInfoCard}>
              <Text style={styles.descriptionText} numberOfLines={isDescExpanded ? undefined : 3}>
                {currentMovie.content?.replace(/<[^>]*>/g, '') || 'Nội dung phim đang được cập nhật.'}
              </Text>
              
              {isDescExpanded && (
                <View style={styles.expandedInfoMeta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Đạo diễn:</Text>
                    <Text style={styles.metaValue}>
                      {currentMovie.director?.join(', ') || 'Đang cập nhật'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Thời lượng:</Text>
                    <Text style={styles.metaValue}>{currentMovie.time || 'Đang cập nhật'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Diễn viên:</Text>
                    <Text style={styles.metaValue} numberOfLines={2}>
                      {currentMovie.actor?.join(', ') || 'Đang cập nhật'}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.toggleCollapseBtn}
                onPress={() => setIsDescExpanded(!isDescExpanded)}
              >
                <Text style={styles.toggleCollapseText}>
                  {isDescExpanded ? 'Thu gọn' : 'Thông tin chi tiết'}
                </Text>
                {isDescExpanded ? (
                  <ChevronUp color="#8b8d99" size={14} />
                ) : (
                  <ChevronDown color="#8b8d99" size={14} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Nút tác vụ Xem phim / Yêu thích / Báo lỗi / Chia sẻ */}
        <View style={[styles.detailActionBar, isWatching && { marginTop: 15 }]}>
          {!isWatching && (
            <TouchableOpacity
              style={styles.detailPlayMainButton}
              activeOpacity={0.8}
              onPress={() => {
                if (episodes.length > 0) {
                  playEpisode(episodes[0].link_embed, 0);
                } else {
                  showToast('Đang cập nhật link tập phim');
                }
              }}
            >
              <Play color="#000000" size={16} fill="#000000" />
              <Text style={styles.detailPlayMainText}>Phát phim</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.actionIconsRow, isWatching && { width: '100%', justifyContent: 'space-around' }]}>
            <TouchableOpacity style={styles.actionIconPill} onPress={() => toggleFavorite(currentMovie)}>
              <Heart
                color={isFav ? '#ffc837' : '#8b8d99'}
                fill={isFav ? '#ffc837' : 'none'}
                size={18}
              />
              <Text style={[styles.actionIconLabel, isFav && { color: '#ffc837' }]}>Yêu thích</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconPill} onPress={() => handleShare(currentMovie)}>
              <Share2 color="#8b8d99" size={18} />
              <Text style={styles.actionIconLabel}>Chia sẻ</Text>
            </TouchableOpacity>

            {isWatching && (
              <TouchableOpacity
                style={styles.actionIconPill}
                onPress={() => showToast('Báo cáo sự cố đã được ghi nhận!')}
              >
                <AlertTriangle color="#ff453a" size={18} />
                <Text style={[styles.actionIconLabel, { color: '#ff453a' }]}>Báo lỗi video</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs Phân Đoạn Thông Tin Phim */}
        <View style={styles.detailTabsHeader}>
          {[
            { id: 'eps', label: 'Tập phim' },
            { id: 'suggest', label: 'Đề xuất' },
            { id: 'gallery', label: 'Gallery' },
            { id: 'cast', label: 'Diễn viên' },
            { id: 'comment', label: 'Bình luận' },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.detailTabItem, detailActiveTab === t.id && styles.detailTabItemActive]}
              onPress={() => setDetailActiveTab(t.id as any)}
            >
              <Text
                style={[
                  styles.detailTabItemText,
                  detailActiveTab === t.id && styles.detailTabItemTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nội dung Tab kích hoạt */}
        <View style={styles.detailTabContentContainer}>
          {detailActiveTab === 'eps' && (
            <View style={styles.episodesGrid}>
              {episodes.map((ep, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.episodeButton, currentEpIndex === idx && styles.episodeButtonActive]}
                  onPress={() => playEpisode(ep.link_embed, idx)}
                >
                  {currentEpIndex === idx && (
                    <Play color="#000000" size={10} fill="#000000" style={{ marginRight: 4 }} />
                  )}
                  <Text
                    style={[
                      styles.episodeButtonText,
                      currentEpIndex === idx && styles.episodeButtonTextActive,
                    ]}
                  >
                    Tập {ep.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {episodes.length === 0 && (
                <Text style={styles.emptyTabText}>Đang cập nhật tập phim...</Text>
              )}
            </View>
          )}

          {detailActiveTab === 'suggest' && (
            <View style={styles.suggestedGrid}>
              {suggestedMovies.map((m) => (
                <TouchableOpacity
                  key={m.slug}
                  style={styles.suggestCard}
                  onPress={() => openDetail(m.slug)}
                >
                  <View style={styles.suggestCardImageContainer}>
                    <Image
                      source={{ uri: getImageUrl(m.poster_url) }}
                      style={styles.suggestCardImage}
                      resizeMode="cover"
                    />
                    <View style={styles.cardQualityBadge}>
                      <Text style={styles.cardQualityText}>{m.quality || 'HD'}</Text>
                    </View>
                  </View>
                  <Text style={styles.suggestCardTitle} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <View style={styles.suggestCardMeta}>
                    <Text style={styles.matchText}>{getFakeMatch(m.slug)} Trùng khớp</Text>
                    <Text style={styles.suggestYear}>{m.year}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {detailActiveTab === 'gallery' && (
            <View style={styles.galleryContainer}>
              <Image
                source={{ uri: getImageUrl(currentMovie.poster_url) }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
              <Image
                source={{ uri: getImageUrl(currentMovie.thumb_url) }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            </View>
          )}

          {detailActiveTab === 'cast' && (
            <View style={styles.castWrapper}>
              {currentMovie.actor && currentMovie.actor.filter((a) => a).length > 0 ? (
                currentMovie.actor.map((a, idx) => (
                  <View key={idx} style={styles.castTag}>
                    <Text style={styles.castTagText}>{a}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyTabText}>Đang cập nhật danh sách diễn viên</Text>
              )}
            </View>
          )}

          {detailActiveTab === 'comment' && (
            <View style={styles.commentsContainer}>
              <View style={styles.commentInputBox}>
                <TextInput
                  placeholder="Viết bình luận công khai..."
                  placeholderTextColor="#4e505a"
                  style={styles.commentTextInput}
                  multiline
                />
                <View style={styles.commentActionRow}>
                  <Text style={styles.revealLabel}>Tiết lộ nội dung?</Text>
                  <TouchableOpacity
                    style={styles.sendCommentBtn}
                    onPress={() => showToast('Vui lòng đăng nhập để bình luận')}
                  >
                    <Text style={styles.sendCommentText}>Gửi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Thanh điều hướng nổi phía dưới (Floating Bottom Bar)
  const renderBottomBar = () => {
    return (
      <View style={styles.bottomBarWrapper}>
        <BlurView intensity={30} tint="dark" style={styles.bottomBarBlur}>
          <TouchableOpacity
            style={[styles.bottomBarTab, navActiveTab === 'home' && styles.bottomBarTabActive]}
            onPress={() => {
              setNavActiveTab('home');
              setCurrentView('home');
              setIsWatching(false);
              setIsPlayingEmbed('');
            }}
          >
            <Home color={navActiveTab === 'home' ? '#ffc837' : '#8b8d99'} size={20} />
            <Text
              style={[styles.bottomBarTabText, navActiveTab === 'home' && styles.bottomBarTabTextActive]}
            >
              Trang chủ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBarTab, navActiveTab === 'lib' && styles.bottomBarTabActive]}
            onPress={openLibrary}
          >
            <Film color={navActiveTab === 'lib' ? '#ffc837' : '#8b8d99'} size={20} />
            <Text
              style={[styles.bottomBarTabText, navActiveTab === 'lib' && styles.bottomBarTabTextActive]}
            >
              Thư viện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBarTab, navActiveTab === 'fav' && styles.bottomBarTabActive]}
            onPress={openWatchlist}
          >
            <Heart color={navActiveTab === 'fav' ? '#ffc837' : '#8b8d99'} size={20} />
            <Text
              style={[styles.bottomBarTabText, navActiveTab === 'fav' && styles.bottomBarTabTextActive]}
            >
              Yêu thích
            </Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  };

  // Ô tìm kiếm tích hợp ngay trên giao diện
  const renderSearchSection = () => {
    return (
      <View style={styles.searchBarSection}>
        <View style={styles.searchInputContainer}>
          <Search color="#8b8d99" size={16} style={{ marginLeft: 12 }} />
          <TextInput
            placeholder="Tìm phim, thể loại, đạo diễn..."
            placeholderTextColor="#8b8d99"
            style={styles.searchTextInput}
            value={searchKeyword}
            onChangeText={(txt) => setSearchKeyword(txt)}
            onSubmitEditing={() => executeSearch(searchKeyword)}
            returnKeyType="search"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.clearSearchBtn}>
              <X color="#8b8d99" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor="#06070d" />

      {/* Tiêu đề & Logo Header */}
      {renderHeader()}

      {/* Tìm kiếm */}
      {renderSearchSection()}

      {/* Khung nội dung chính */}
      <View style={styles.mainContent}>
        {currentView === 'home' && renderHomeView()}
        {currentView === 'grid' && renderGridView()}
        {currentView === 'detail' && renderDetailView()}
      </View>

      {/* Close button chỉ hiển thị khi mở lồng trong app chính */}
      {process.env.EXPO_PUBLIC_APP_TYPE !== 'movie' && (
        <TouchableOpacity
          style={styles.closeFloatingButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X color="#ffffff" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {/* Floating Bottom Nav */}
      {renderBottomBar()}

      {/* Toast System overlay */}
      {toast && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b8d99',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  mainContent: {
    flex: 1,
  },
  // Header styles
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  menuButton: {
    marginRight: 12,
    padding: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#ffc837',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  premiumBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 12,
  },
  premiumText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  searchHeaderButton: {
    padding: 4,
  },
  // Search bar styles
  searchBarSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInputContainer: {
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchTextInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 10,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 8,
  },
  // Genres filter
  genresWrapper: {
    marginTop: 15,
  },
  genresScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genrePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  genrePillText: {
    color: '#d1d2d5',
    fontSize: 11,
    fontWeight: '700',
  },
  // Hero slider styles
  heroSliderContainer: {
    width: width,
    height: width * 0.62,
    position: 'relative',
    backgroundColor: '#121320',
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    opacity: 0.45,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 200, 55, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 55, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#ffc837',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroMeta: {
    color: '#8b8d99',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  heroPlayText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  heroDetailBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  heroDetailText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  // Shelf styles
  shelfContainer: {
    marginTop: 25,
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  shelfTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shelfIndicator: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  shelfTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  seeAllText: {
    color: '#ffc837',
    fontSize: 9,
    fontWeight: '800',
  },
  shelfScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 100,
  },
  cardImageContainer: {
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#121320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardQualityBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardQualityText: {
    color: '#ffc837',
    fontSize: 8,
    fontWeight: '900',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
  },
  cardTitle: {
    color: '#e2e3e5',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  cardMeta: {
    color: '#8b8d99',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
  homeScrollContent: {
    paddingBottom: 100,
  },
  // Grid / Library styles
  gridContainer: {
    flex: 1,
  },
  gridHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  gridTitle: {
    color: '#ffc837',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridCardWrapper: {
    width: (width - 32 - 16) / 3,
    marginBottom: 15,
    marginRight: 8,
  },
  gridCardImageContainer: {
    width: '100%',
    height: ((width - 32 - 16) / 3) * 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#121320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
  },
  gridCardTitle: {
    color: '#e2e3e5',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 6,
  },
  gridCardMeta: {
    color: '#8b8d99',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyGridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyGridText: {
    color: '#8b8d99',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Floating bottom bar styles
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(6, 7, 13, 0.85)',
  },
  bottomBarBlur: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  bottomBarTab: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    gap: 3,
  },
  bottomBarTabActive: {
    opacity: 1,
  },
  bottomBarTabText: {
    color: '#8b8d99',
    fontSize: 9,
    fontWeight: '800',
  },
  bottomBarTabTextActive: {
    color: '#ffc837',
  },
  // Detail View styles
  detailScrollContent: {
    paddingBottom: 100,
  },
  mediaContainer: {
    width: width,
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  playerWebView: {
    flex: 1,
  },
  backdropPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  backdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  nativePlayOverlayButton: {
    position: 'absolute',
    zIndex: 10,
  },
  playOverlayCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffc837',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffc837',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  detailMetaHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  detailSubTitle: {
    color: '#8b8d99',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  detailImdbBadge: {
    backgroundColor: '#ffc837',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailImdbText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  detailMetaText: {
    color: '#d1d2d5',
    fontSize: 11,
    fontWeight: '600',
  },
  dotDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  qualityBadgeBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  qualityBadgeTextBorder: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  collapsibleInfoCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  descriptionText: {
    color: '#b2b3b7',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  expandedInfoMeta: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    color: '#5e5f67',
    fontSize: 11,
    fontWeight: '600',
    width: 80,
  },
  metaValue: {
    color: '#d1d2d5',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  toggleCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  toggleCollapseText: {
    color: '#8b8d99',
    fontSize: 11,
    fontWeight: '600',
  },
  // Detail actions
  detailActionBar: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  detailPlayMainButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailPlayMainText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  actionIconsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  actionIconLabel: {
    color: '#8b8d99',
    fontSize: 10,
    fontWeight: '800',
  },
  // Tab segments
  detailTabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 25,
    paddingHorizontal: 16,
    gap: 16,
  },
  detailTabItem: {
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  detailTabItemActive: {
    borderColor: '#ffc837',
  },
  detailTabItemText: {
    color: '#8b8d99',
    fontSize: 12,
    fontWeight: '800',
  },
  detailTabItemTextActive: {
    color: '#ffc837',
  },
  detailTabContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  emptyTabText: {
    color: '#8b8d99',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  episodeButton: {
    width: (width - 32 - 20) / 3,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#121320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  episodeButtonActive: {
    backgroundColor: '#ffc837',
    borderColor: '#ffc837',
  },
  episodeButtonText: {
    color: '#d1d2d5',
    fontSize: 11,
    fontWeight: '800',
  },
  episodeButtonTextActive: {
    color: '#000000',
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestCard: {
    width: (width - 32 - 10) / 2,
    marginBottom: 15,
  },
  suggestCardImageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#121320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  suggestCardImage: {
    width: '100%',
    height: '100%',
  },
  suggestCardTitle: {
    color: '#e2e3e5',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  suggestCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  matchText: {
    color: '#30d158',
    fontSize: 9,
    fontWeight: '800',
  },
  suggestYear: {
    color: '#8b8d99',
    fontSize: 9,
    fontWeight: '600',
  },
  galleryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  galleryImage: {
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  castWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  castTag: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  castTagText: {
    color: '#d1d2d5',
    fontSize: 10.5,
    fontWeight: '700',
  },
  commentsContainer: {
    paddingBottom: 20,
  },
  commentInputBox: {
    backgroundColor: '#121320',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  commentTextInput: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '400',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  commentActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
    marginTop: 10,
  },
  revealLabel: {
    color: '#5e5f67',
    fontSize: 10.5,
    fontWeight: '600',
  },
  sendCommentBtn: {
    backgroundColor: '#ffc837',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendCommentText: {
    color: '#000000',
    fontSize: 10.5,
    fontWeight: '800',
  },
  // Close floating button
  closeFloatingButton: {
    position: 'absolute',
    top: height > 800 ? 56 : 32,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  // Toast styles
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  toastBox: {
    backgroundColor: 'rgba(18, 19, 32, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
