import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Image, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, useThemeUpdate } from '../constants/theme';

// 🔴 ĐÃ CẬP NHẬT FULL BỘ ICON TỪ LUCIDE GIỐNG Y HỆT WEB CỦA SẾP
import { X, ShieldCheck, ChevronLeft, CalendarPlus, UserX, LayoutDashboard, Ticket, Banknote, Users, Crown, Gem, Trash2, Box, Search, PlusCircle, Layers, Flame, RefreshCw, Menu } from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
// Nhập thêm deleteDoc, serverTimestamp để xử lý Giftcode
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, Timestamp, deleteDoc, serverTimestamp } from 'firebase/firestore';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";

export default function AdminScreen() {
  useThemeUpdate();
  const styles = getStyles(COLORS);
  const router = useRouter();
  const isStandaloneAdmin = process.env.EXPO_PUBLIC_APP_TYPE === 'admin';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // States hỗ trợ xác thực Firebase Auth Admin
  const [adminEmail, setAdminEmail] = useState('mquitran@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [firebaseAuthenticated, setFirebaseAuthenticated] = useState(false);
  
  // 🔴 TABS VÀ TÌM KIẾM KHÁCH HÀNG
  const [activeTab, setActiveTab] = useState('DASHBOARD'); 
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [renderLimit, setRenderLimit] = useState(30);

  // MMO states
  const [mmoRawProducts, setMmoRawProducts] = useState<any[]>([]);
  const [mmoConfigState, setMmoConfigState] = useState<any>({});
  const [categoryMetadataMap, setCategoryMetadataMap] = useState<any>({});
  const [allMmoOrders, setAllMmoOrders] = useState<any[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  
  const [selectedMmoOrders, setSelectedMmoOrders] = useState<Set<number>>(new Set());
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeMmoOrderFilter, setActiveMmoOrderFilter] = useState<'PENDING_PAID' | 'COMPLETED' | 'ALL'>('PENDING_PAID');
  
  // Category tab state
  const [selectedCatName, setSelectedCatName] = useState<string | null>(null);
  const [catManagerIcon, setCatManagerIcon] = useState('');
  const [catManagerOrder, setCatManagerOrder] = useState('999');
  const [catManagerHot, setCatManagerHot] = useState(false);
  const [catManagerHidden, setCatManagerHidden] = useState(false);

  // Form custom product state
  const [checkKingMmoId, setCheckKingMmoId] = useState('');
  const [customFormName, setCustomFormName] = useState('');
  const [customFormCat, setCustomFormCat] = useState('');
  const [customFormStock, setCustomFormStock] = useState('999');
  const [customFormPrice, setCustomFormPrice] = useState('');
  const [customFormFakePrice, setCustomFormFakePrice] = useState('');
  const [customFormIcon, setCustomFormIcon] = useState('');
  const [customFormDesc, setCustomFormDesc] = useState('');

  // Form Deal Hot state
  const [dealTargetId, setDealTargetId] = useState('');
  const [dealName, setDealName] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [dealEndTime, setDealEndTime] = useState('');
  const [dealIcon, setDealIcon] = useState('');

  // Advanced User Edit Modal state
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [editUserUid, setEditUserUid] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserCoins, setEditUserCoins] = useState('');
  const [editUserVipDate, setEditUserVipDate] = useState<Date | null>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // Manual Fulfill Modal state
  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [manualFulfillRow, setManualFulfillRow] = useState<number | null>(null);
  const [manualAccountText, setManualAccountText] = useState('');

  // Filter & Search states for Config tab
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productRenderLimit, setProductRenderLimit] = useState(30);

  // Bulk actions states
  const [bulkPercent, setBulkPercent] = useState('');
  const [bulkPriceTarget, setBulkPriceTarget] = useState<'price' | 'fakePrice'>('price');
  const [bulkCatInput, setBulkCatInput] = useState('');

  // Dữ liệu Web & Firebase
  const [usersList, setUsersList] = useState<any[]>([]);
  const [giftcodesList, setGiftcodesList] = useState<any[]>([]);
  const [dataKho, setDataKho] = useState<any[]>([]);
  const [sysConfig, setSysConfig] = useState({ 
    popupMsg: '', 
    showPopup: false, 
    enable14Days: true,
    homePopupShow: false,
    homePopupTitle: '',
    homePopupMsg: '',
    homePopupImg: '',
    homePopupUrl: '',
    forceUpdateShow: false,
    forceUpdateAllowSkip: false,
    forceUpdateMsg: '',
    forceUpdateUrl: '',
    vipPrice14D: 20000,
    vipPrice30D: 40000,
    vipPrice1Y: 300000,
    vipFeaturesText: ''
  });

  // State thông báo máy
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [registeredDeviceCount, setRegisteredDeviceCount] = useState(0);
  
  // State Hẹn giờ gửi
  const [scheduleDelay, setScheduleDelay] = useState('0'); 
  const [customDate, setCustomDate] = useState(new Date(Date.now() + 10 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [scheduledPushes, setScheduledPushes] = useState<any[]>([]);
  
  // Thống kê
  const [stats, setStats] = useState({ revenue: 0, totalUsers: 0, totalVips: 0, totalCoins: 0 });
  const [invStats, setInvStats] = useState<any>({ 'Spotify': {total: 0, available: 0, sold: 0}, 'Netflix': {total: 0, available: 0, sold: 0}, 'CapCut': {total: 0, available: 0, sold: 0} });

  // State nạp kho
  const [newAccType, setNewAccType] = useState('Spotify');
  const [newAccInfo, setNewAccInfo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // State Giftcode
  const [gcName, setGcName] = useState('');
  const [gcType, setGcType] = useState('coins'); 
  const [gcValue, setGcValue] = useState('');
  const [gcLimit, setGcLimit] = useState('100');
  const [isCreatingGc, setIsCreatingGc] = useState(false);

  const TABS = [
    { id: 'DASHBOARD', label: 'TỔNG QUAN', icon: LayoutDashboard },
    { id: 'MEMBERS', label: 'KHÁCH HÀNG', icon: Users },
    { id: 'TRANSACTIONS', label: 'LỊCH SỬ NẠP', icon: Banknote },
    { id: 'MALL_ORDERS', label: 'DUYỆT ĐƠN MALL', icon: Ticket },
    { id: 'PRODUCTS', label: 'KHO SẢN PHẨM', icon: Box },
    { id: 'CATEGORIES', label: 'DANH MỤC', icon: Layers },
    { id: 'ADD_PRODUCT', label: 'THÊM SP', icon: PlusCircle },
    { id: 'DEAL_HOT', label: 'DEAL HOT', icon: Flame },
    { id: 'KHOTK', label: 'KHO APPLE ID', icon: Box },
    { id: 'GIFTCODES', label: 'GIFTCODE', icon: Ticket },
    { id: 'PUSH', label: 'THÔNG BÁO PUSH', icon: Users },
    { id: 'SETTINGS', label: 'CÀI ĐẶT', icon: X }
  ];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email?.toLowerCase() === 'mquitran@gmail.com') {
        setFirebaseAuthenticated(true);
        AsyncStorage.getItem('@admin_pin').then(savedPin => {
          if (savedPin) {
            handleLoginAdmin(savedPin);
          }
        });
      } else {
        setFirebaseAuthenticated(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  const getVipMillis = (vipExpire: any) => {
    if (!vipExpire) return 0;
    if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
    if (vipExpire.seconds) return vipExpire.seconds * 1000;
    return Number(vipExpire) || 0;
  };

  const handleLoginAdmin = async (targetPin?: any) => {
    const pinToUse = (typeof targetPin === 'string' ? targetPin : null) || pin;
    if (!pinToUse) return Alert.alert("Lỗi", "Nhập mã PIN");
    setIsVerifying(true);
    try {
      // 1. Xác thực Firebase Auth nếu chưa đăng nhập đúng tài khoản Admin
      const currentEmail = auth.currentUser?.email;
      if (!currentEmail || currentEmail.toLowerCase() !== 'mquitran@gmail.com') {
        if (!targetPin && !adminPassword) {
          setIsVerifying(false);
          return Alert.alert("Lỗi", "Vui lòng nhập mật khẩu tài khoản Admin Firebase");
        }
        if (!targetPin) {
          await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
        }
      }

      // 2. Xác thực PIN với Google Sheets API
      const res = await fetch(`${SCRIPT_URL}?action=verify_pin&pin=${encodeURIComponent(pinToUse)}`);
      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        if (targetPin) {
          setPin(targetPin);
        }
        await AsyncStorage.setItem('@admin_pin', pinToUse);
        await loadFirebaseData(pinToUse);
      } else {
        Alert.alert("Lỗi", "Sai mã PIN!");
        await AsyncStorage.removeItem('@admin_pin');
      }
    } catch (e: any) {
      Alert.alert("Lỗi xác thực", e.message || "Mật khẩu Admin hoặc mã PIN không chính xác!");
    }
    setIsVerifying(false);
  };

  const loadFirebaseData = async (activePin?: string) => {
    const pinToUse = activePin || pin;
    
    // 1. Tải cấu hình settings/config từ Firestore
    const snapConfig = await getDoc(doc(db, 'settings', 'config'));
    if (snapConfig.exists()) {
      const data = snapConfig.data();
      setSysConfig(prev => ({
        ...prev,
        ...data,
        vipPrice14D: data.vipPrice14D !== undefined ? data.vipPrice14D : 20000,
        vipPrice30D: data.vipPrice30D !== undefined ? data.vipPrice30D : 40000,
        vipPrice1Y: data.vipPrice1Y !== undefined ? data.vipPrice1Y : 300000,
        vipFeaturesText: data.vipFeaturesText !== undefined ? data.vipFeaturesText : `Mở khóa toàn bộ Kho Ứng Dụng Độc Quyền
Tốc độ tải ứng dụng cực cao (Không giới hạn)
Không có quảng cáo khó chịu từ hệ thống
Chứng chỉ luôn được gia hạn tự động ổn định
Hỗ trợ cài đặt trực tiếp qua OTA nhanh gọn
Ký và cài đặt file IPA ngoại tuyến của riêng bạn`
      }));
    }
    
    // 2. Tải Khách hàng & Tính tổng
    const usersSnap = await getDocs(collection(db, 'users'));
    let arr: any[] = [];
    let tUsers = 0, tVips = 0, tCoins = 0;
    
    usersSnap.forEach(d => {
       const uData = d.data();
       arr.push({ id: d.id, ...uData });
       tUsers++;
       tCoins += (uData.coins || 0);
       if (getVipMillis(uData.vipExpire) > Date.now()) tVips++;
    });
    
    arr.sort((a, b) => getVipMillis(b.vipExpire) - getVipMillis(a.vipExpire));
    setUsersList(arr);
    setStats(prev => ({ ...prev, totalUsers: tUsers, totalVips: tVips, totalCoins: tCoins }));

    // 3. Tải Giftcodes
    const gcSnap = await getDocs(collection(db, 'giftcodes'));
    let gcArr: any[] = [];
    gcSnap.forEach(d => gcArr.push({ id: d.id, ...d.data() }));
    setGiftcodesList(gcArr);

    // 4. Tải số lượng thiết bị đăng ký nhận thông báo từ Google Sheet
    try {
      const resCount = await fetch(`${SCRIPT_URL}?action=get_push_tokens_count&pin=${encodeURIComponent(pinToUse)}`);
      const jsonCount = await resCount.json();
      if (jsonCount.success) {
        setRegisteredDeviceCount(jsonCount.count);
      }
    } catch (e) {
      console.warn("Failed to fetch push tokens count:", e);
    }

    // 5. Tải danh sách thông báo đã hẹn giờ
    try {
      const resSched = await fetch(`${SCRIPT_URL}?action=get_scheduled_pushes&pin=${encodeURIComponent(pinToUse)}`);
      const jsonSched = await resSched.json();
      if (jsonSched.success) {
        setScheduledPushes(jsonSched.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch scheduled pushes:", e);
    }

    // 6. Tải Lịch sử nạp & Doanh thu từ Google Sheet (action=get_admin_data)
    try {
      const resData = await fetch(`${SCRIPT_URL}?action=get_admin_data&pin=${encodeURIComponent(pinToUse)}`);
      const data = await resData.json(); 
      if (data.success) { 
        let totalRev = 0; 
        let txs: any[] = [];
        let tempInv = { 'Spotify': {total: 0, available: 0, sold: 0}, 'Netflix': {total: 0, available: 0, sold: 0}, 'CapCut': {total: 0, available: 0, sold: 0} };

        if (data.dataThuNgan && data.dataThuNgan.length > 1) {
          for(let i = 1; i < data.dataThuNgan.length; i++) {
            let r = data.dataThuNgan[i]; 
            if(r[4] === 'CLAIMED' || r[4] === 'PAID') totalRev += (parseInt(r[2]) || 0);
            txs.push({ orderId: r[0], uid: r[1], amount: parseInt(r[2]) || 0, coins: parseInt(r[3]) || 0, status: r[4], time: r[5] });
          }
        }

        if (data.dataKho) {
          setDataKho(data.dataKho || []); 
          for(let i = 1; i < data.dataKho.length; i++) {
            let r = data.dataKho[i]; let type = r[0]; let status = r[2];
            if(tempInv[type as keyof typeof tempInv]) {
              tempInv[type as keyof typeof tempInv].total++;
              if(status === 'SẴN SÀNG') tempInv[type as keyof typeof tempInv].available++; 
              else tempInv[type as keyof typeof tempInv].sold++;
            }
          }
        }

        setStats(prev => ({ ...prev, revenue: totalRev }));
        setInvStats(tempInv);
        setTransactionsList(txs.reverse()); 
      }
    } catch (e) {
      console.warn("Failed to fetch transactions list:", e);
    }

    // 7. Tải Đơn hàng Mall (action=admin_get_all_mmo_orders)
    try {
      const resMMO = await fetch(`${SCRIPT_URL}?action=admin_get_all_mmo_orders&pin=${encodeURIComponent(pinToUse)}`);
      const dataMMO = await resMMO.json();
      if (dataMMO.success) {
        setAllMmoOrders(dataMMO.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch MMO orders:", e);
    }

    // 8. Tải Kho sản phẩm & Cấu hình MMO (action=get_kingmmo_products)
    try {
      const resP = await fetch(`${SCRIPT_URL}?action=get_kingmmo_products`);
      const dataP = await resP.json();
      if (dataP.success) {
        let rawProducts = dataP.kingmmoProducts || [];
        let configs = dataP.configs || {};
        let configState: any = {};
        let catMap: any = {};
        
        // Phân loại cấu hình
        Object.keys(configs).forEach(k => {
          if (k.startsWith('CAT___')) {
            let cName = k.replace('CAT___', '');
            catMap[cName] = {
              icon: configs[k].icon || '',
              order: configs[k].stock !== "" && configs[k].stock !== undefined ? parseInt(configs[k].stock) : 999,
              hot: configs[k].desc === 'HOT',
              hidden: configs[k].isHidden === true || String(configs[k].isHidden).toLowerCase() === "true"
            };
          } else if (k === 'DEAL___HOT') {
            configState[k] = configs[k];
            // Đổ cấu hình Deal Hot
            setDealTargetId(configs[k].cat || '');
            setDealName(configs[k].name || '');
            setDealPrice(String(configs[k].price || ''));
            setDealEndTime(configs[k].desc || '');
            setDealIcon(configs[k].icon || '');
          } else {
            configState[k] = configs[k];
          }
        });
        
        // Map hàng custom
        let apiIds = new Set(rawProducts.map((p: any) => String(p.id)));
        Object.keys(configs).forEach(k => {
          if (!k.startsWith('CAT___') && k !== 'DEAL___HOT') {
            let conf = configs[k];
            if (!apiIds.has(String(k)) && conf.name) {
              rawProducts.unshift({
                id: k,
                name: conf.name,
                price: parseInt(conf.price) || 0,
                cat: conf.cat || 'Khác',
                stock: conf.stock !== "" && conf.stock !== undefined ? parseInt(conf.stock) : 0
              });
            }
          }
        });
        
        setMmoRawProducts(rawProducts);
        setMmoConfigState(configState);
        setCategoryMetadataMap(catMap);
        setHasUnsavedChanges(false);
      }
    } catch (e) {
      console.warn("Failed to fetch MMO products catalog:", e);
    }
  };

  // Helpers to update config states
  const updateProductConfig = (id: string, key: string, val: any) => {
    setMmoConfigState((prev: any) => {
      const next = { ...prev };
      if (!next[id]) next[id] = {};
      next[id][key] = val;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const updateCategoryConfig = (cName: string, key: string, val: any) => {
    setCategoryMetadataMap((prev: any) => {
      const next = { ...prev };
      if (!next[cName]) next[cName] = {};
      next[cName][key] = val;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const saveCategorySettings = () => {
    if (!selectedCatName) return;
    updateCategoryConfig(selectedCatName, 'icon', catManagerIcon);
    updateCategoryConfig(selectedCatName, 'order', parseInt(catManagerOrder) || 999);
    updateCategoryConfig(selectedCatName, 'hot', catManagerHot);
    updateCategoryConfig(selectedCatName, 'hidden', catManagerHidden);
    Alert.alert("Thành công", "Đã lưu cấu hình danh mục locally. Hãy nhấn nút Lưu máy chủ ở cuối trang để gửi lên Sheets.");
  };

  // Google Sheets config sync
  const saveAllConfigsToServer = async () => {
    setIsVerifying(true);
    try {
      const payload: any[] = [];
      
      // 1. Thêm tất cả cấu hình sản phẩm
      Object.keys(mmoConfigState).forEach(k => {
        if (k !== 'DEAL___HOT' && !k.startsWith('CAT___')) {
          const conf = mmoConfigState[k];
          const rawP = mmoRawProducts.find(p => String(p.id) === String(k));
          const name = conf.name || rawP?.name || '';
          const cat = conf.cat || rawP?.cat || 'Khác';
          
          payload.push({
            id: k,
            name: name,
            price: conf.price !== undefined ? conf.price : (rawP?.price || 0),
            fakePrice: conf.fakePrice || '',
            icon: conf.icon || '',
            isHidden: conf.isHidden || false,
            cat: cat,
            stock: conf.stock !== undefined ? conf.stock : '',
            desc: conf.desc || ''
          });
        }
      });
      
      // 2. Thêm cấu hình danh mục
      Object.keys(categoryMetadataMap).forEach(cName => {
        const cat = categoryMetadataMap[cName];
        payload.push({
          id: `CAT___${cName}`,
          name: cName,
          price: '',
          fakePrice: '',
          icon: cat.icon || '',
          isHidden: cat.hidden || false,
          cat: '',
          stock: cat.order !== undefined ? cat.order : 999,
          desc: cat.hot ? 'HOT' : ''
        });
      });
      
      // 3. Thêm cấu hình Deal Hot nếu có
      if (mmoConfigState['DEAL___HOT']) {
        const deal = mmoConfigState['DEAL___HOT'];
        payload.push({
          id: 'DEAL___HOT',
          name: deal.name || '',
          price: deal.price || 0,
          fakePrice: '',
          icon: deal.icon || '',
          isHidden: false,
          cat: deal.cat || '', 
          stock: '',
          desc: deal.desc || '' 
        });
      }

      const response = await fetch(`${SCRIPT_URL}?action=admin_save_mmo_config&pin=${encodeURIComponent(pin)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `configs=${encodeURIComponent(JSON.stringify(payload))}`
      });
      
      const json = await response.json();
      if (json.success) {
        Alert.alert("Thành công", "Đã lưu toàn bộ cấu hình lên máy chủ!");
        setHasUnsavedChanges(false);
        loadFirebaseData();
      } else {
        Alert.alert("Lỗi", json.error || "Không thể lưu cấu hình.");
      }
    } catch (error: any) {
      Alert.alert("Lỗi kết nối", error.message || "Không thể lưu cấu hình lên máy chủ.");
    }
    setIsVerifying(false);
  };

  // Mall orders handling functions
  const fulfillOrderAPI = async (row: number, productId: string, amount: number) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=admin_fulfill_kingmmo&pin=${encodeURIComponent(pin)}&row=${row}&productId=${productId}&amount=${amount}`);
      const json = await res.json();
      if (json.success) {
        Alert.alert("Thành công", "Đã duyệt đơn hàng thành công!");
        loadFirebaseData();
      } else {
        Alert.alert("Lỗi", json.error || "Duyệt đơn thất bại");
      }
    } catch (e: any) {
      Alert.alert("Lỗi kết nối", e.message);
    }
    setIsVerifying(false);
  };

  const fulfillOrderManual = async (row: number, accountData: string) => {
    if (!accountData.trim()) return Alert.alert("Lỗi", "Nhập thông tin tài khoản");
    setIsVerifying(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=admin_manual_fulfill&pin=${encodeURIComponent(pin)}&row=${row}&accountData=${encodeURIComponent(accountData)}`);
      const json = await response.json();
      if (json.success) {
        Alert.alert("Thành công", "Đã trả acc thủ công thành công!");
        setIsManualModalVisible(false);
        setManualAccountText('');
        loadFirebaseData();
      } else {
        Alert.alert("Lỗi", json.error || "Duyệt đơn thất bại");
      }
    } catch (e: any) {
      Alert.alert("Lỗi kết nối", e.message);
    }
    setIsVerifying(false);
  };

  const deleteOrder = async (row: number) => {
    Alert.alert("Cảnh báo", "Bạn có chắc chắn muốn xóa đơn hàng này khỏi danh sách?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          setIsVerifying(true);
          try {
            const res = await fetch(`${SCRIPT_URL}?action=admin_delete_mmo_order&pin=${encodeURIComponent(pin)}&row=${row}`);
            const json = await res.json();
            if (json.success) {
              Alert.alert("Thành công", "Đã xóa đơn hàng!");
              loadFirebaseData();
            } else {
              Alert.alert("Lỗi", json.error || "Xóa đơn thất bại");
            }
          } catch (e: any) {
            Alert.alert("Lỗi kết nối", e.message);
          }
          setIsVerifying(false);
        }
      }
    ]);
  };

  const bulkFulfillOrders = async () => {
    if (selectedMmoOrders.size === 0) {
      return Alert.alert("Thông báo", "Vui lòng chọn ít nhất một đơn hàng để duyệt.");
    }
    Alert.alert(
      "Xác nhận duyệt",
      `Duyệt tự động ${selectedMmoOrders.size} đơn hàng đã chọn qua API KingMMO?`,
      [
        { text: "Hủy", style: "cancel" },
        { text: "Đồng ý", onPress: async () => {
            setIsVerifying(true);
            let successCount = 0;
            let failCount = 0;
            for (const row of selectedMmoOrders) {
              const order = allMmoOrders.find(o => o.row === row);
              if (order) {
                try {
                  const res = await fetch(`${SCRIPT_URL}?action=admin_fulfill_kingmmo&pin=${encodeURIComponent(pin)}&row=${row}&productId=${order.productId}&amount=${order.amount}`);
                  const json = await res.json();
                  if (json.success) successCount++;
                  else failCount++;
                } catch (e) {
                  failCount++;
                }
              }
            }
            Alert.alert("Kết quả", `Duyệt hàng loạt thành công: ${successCount} đơn. Thất bại: ${failCount} đơn.`);
            setSelectedMmoOrders(new Set());
            loadFirebaseData();
          }
        }
      ]
    );
  };

  const toggleSelectOrder = (row: number) => {
    setSelectedMmoOrders(prev => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  const toggleSelectAllOrders = () => {
    const filtered = getFilteredMmoOrders();
    const allSelected = filtered.every(o => selectedMmoOrders.has(o.row));
    setSelectedMmoOrders(prev => {
      const next = new Set(prev);
      filtered.forEach(o => {
        if (allSelected) next.delete(o.row);
        else next.add(o.row);
      });
      return next;
    });
  };

  const getFilteredMmoOrders = () => {
    let list = allMmoOrders;
    if (memberSearchQuery.trim() !== '') {
      const q = memberSearchQuery.toLowerCase().trim();
      list = list.filter(o => 
        String(o.orderId).toLowerCase().includes(q) || 
        String(o.uid).toLowerCase().includes(q) ||
        String(o.productName).toLowerCase().includes(q)
      );
    }
    if (activeMmoOrderFilter === 'PENDING_PAID') {
      return list.filter(o => o.status === 'PENDING' && o.isPaid);
    } else if (activeMmoOrderFilter === 'COMPLETED') {
      return list.filter(o => o.status === 'COMPLETED');
    }
    return list;
  };

  const getFilteredMmoProducts = () => {
    let list = mmoRawProducts;
    if (productCatFilter !== 'all') {
      list = list.filter(p => String(p.cat).toLowerCase() === productCatFilter.toLowerCase());
    }
    if (productSearchQuery.trim() !== '') {
      const q = productSearchQuery.toLowerCase().trim();
      list = list.filter(p => 
        String(p.name).toLowerCase().includes(q) || 
        String(p.id).toLowerCase().includes(q) ||
        String(p.cat).toLowerCase().includes(q)
      );
    }
    return list;
  };

  const getFilteredUsers = () => {
    if (!memberSearchQuery.trim()) return usersList;
    const q = memberSearchQuery.toLowerCase().trim();
    return usersList.filter(u => 
      String(u.fullname || '').toLowerCase().includes(q) || 
      String(u.email || '').toLowerCase().includes(q) || 
      String(u.id || '').toLowerCase().includes(q)
    );
  };

  const toggleSelectConfig = (id: string) => {
    setSelectedConfigs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllConfigs = () => {
    const filtered = getFilteredMmoProducts().slice(0, productRenderLimit);
    const allSelected = filtered.every(p => selectedConfigs.has(String(p.id)));
    setSelectedConfigs(prev => {
      const next = new Set(prev);
      filtered.forEach(p => {
        const id = String(p.id);
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const applyBulkDiscount = (direction: 'up' | 'down') => {
    const percent = parseFloat(bulkPercent);
    if (isNaN(percent) || percent <= 0) {
      return Alert.alert("Lỗi", "Vui lòng nhập phần trăm hợp lệ.");
    }
    if (selectedConfigs.size === 0) {
      return Alert.alert("Thông báo", "Vui lòng tích chọn sản phẩm cần đổi giá.");
    }
    const factor = direction === 'up' ? (1 + percent / 100) : (1 - percent / 100);
    selectedConfigs.forEach(id => {
      const rawP = mmoRawProducts.find(p => String(p.id) === String(id));
      const conf = mmoConfigState[id] || {};
      if (bulkPriceTarget === 'price') {
        const currentPrice = conf.price !== undefined ? conf.price : (rawP?.price || 0);
        updateProductConfig(id, 'price', Math.round(currentPrice * factor));
      } else {
        const currentFake = conf.fakePrice !== undefined ? conf.fakePrice : Math.round((rawP?.price || 0) * 1.3);
        updateProductConfig(id, 'fakePrice', Math.round(currentFake * factor));
      }
    });
    Alert.alert("Thành công", `Đã đổi giá ${selectedConfigs.size} sản phẩm locally. Nhấn Lưu ở góc dưới để lưu máy chủ.`);
  };

  const bulkMoveCategory = () => {
    const newCat = bulkCatInput.trim();
    if (!newCat) return Alert.alert("Lỗi", "Vui lòng nhập tên danh mục.");
    if (selectedConfigs.size === 0) {
      return Alert.alert("Thông báo", "Vui lòng tích chọn sản phẩm cần gộp.");
    }
    selectedConfigs.forEach(id => {
      updateProductConfig(id, 'cat', newCat);
    });
    Alert.alert("Thành công", `Đã gộp ${selectedConfigs.size} sản phẩm sang danh mục "${newCat}". Nhấn Lưu ở góc dưới để lưu máy chủ.`);
    setBulkCatInput('');
  };

  // Customer edit modal save
  const saveUserChanges = async () => {
    if (!editUserUid) return;
    setIsVerifying(true);
    try {
      const userRef = doc(db, 'users', editUserUid);
      const updateData: any = {
        coins: parseInt(editUserCoins) || 0,
      };
      if (editUserVipDate) {
        updateData.vipExpire = Timestamp.fromDate(editUserVipDate);
      } else {
        updateData.vipExpire = null;
      }
      await updateDoc(userRef, updateData);
      Alert.alert("Thành công", "Đã lưu thông tin khách hàng!");
      setIsUserModalVisible(false);
      loadFirebaseData();
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể cập nhật thông tin: " + err.message);
    }
    setIsVerifying(false);
  };

  // Local lookup for KingMMO product scanner
  const handleCheckKingMmo = () => {
    let idStr = checkKingMmoId.trim();
    if (!idStr) return Alert.alert("Lỗi", "Vui lòng nhập Link hoặc ID sản phẩm.");
    const match = idStr.match(/\d+/);
    const id = match ? match[0] : idStr;
    const found = mmoRawProducts.find(p => String(p.id) === String(id));
    if (found) {
      setCustomFormName(found.name || '');
      setCustomFormCat(found.cat || 'Khác');
      setCustomFormPrice(String(found.price || 0));
      const fakePriceVal = Math.round((found.price || 0) * 1.3);
      setCustomFormFakePrice(String(fakePriceVal));
      Alert.alert("Tìm thấy", `Sản phẩm: ${found.name}\nDanh mục: ${found.cat}\nGiá gốc: ${found.price.toLocaleString()}đ`);
    } else {
      Alert.alert("Thông báo", "Không tìm thấy sản phẩm trong KingMMO API. Bạn có thể tự nhập tay.");
    }
  };

  const saveSettings = async () => {
    try { await setDoc(doc(db, 'settings', 'config'), sysConfig, { merge: true }); Alert.alert("Thành công", "Đã lưu cài đặt!"); } 
    catch (error) { Alert.alert("Lỗi", "Không thể lưu."); }
  };

  const handleSendPushNotifications = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo đẩy!");
    }

    Alert.alert(
      "Xác nhận gửi",
      `Gửi thông báo đẩy đến tất cả ${registeredDeviceCount} thiết bị ngay bây giờ?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi ngay",
          onPress: async () => {
            setIsSendingPush(true);
            try {
              const res = await fetch(`${SCRIPT_URL}?action=send_push_now&pin=${encodeURIComponent(pin)}&title=${encodeURIComponent(pushTitle)}&body=${encodeURIComponent(pushBody)}&url=${encodeURIComponent(pushUrl)}`);
              const json = await res.json();
              if (json.success) {
                Alert.alert("Thành công", `Đã gửi thông báo tới ${json.count} thiết bị.`);
                setPushTitle('');
                setPushBody('');
                setPushUrl('');
                loadFirebaseData();
              } else {
                Alert.alert("Lỗi", json.error || "Gửi thất bại.");
              }
            } catch (error: any) {
              Alert.alert("Lỗi gửi thông báo", error.message || "Không thể kết nối máy chủ.");
            }
            setIsSendingPush(false);
          }
        }
      ]
    );
  };

  const handleSchedulePush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo đẩy!");
    }

    // Tính thời gian gửi
    let targetTime = new Date();
    if (scheduleDelay === 'custom') {
      targetTime = new Date(customDate);
      if (targetTime.getTime() <= Date.now()) {
        return Alert.alert("Lỗi", "Thời gian hẹn giờ phải lớn hơn thời gian hiện tại!");
      }
    } else {
      targetTime = new Date(Date.now() + parseInt(scheduleDelay) * 60 * 1000);
    }

    Alert.alert(
      "Xác nhận đặt lịch",
      `Hẹn giờ gửi thông báo vào lúc: ${targetTime.toLocaleString('vi-VN')}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: async () => {
            setIsSendingPush(true);
            try {
              const res = await fetch(`${SCRIPT_URL}?action=schedule_push&pin=${encodeURIComponent(pin)}&title=${encodeURIComponent(pushTitle)}&body=${encodeURIComponent(pushBody)}&url=${encodeURIComponent(pushUrl)}&time=${encodeURIComponent(targetTime.toISOString())}`);
              const json = await res.json();
              if (json.success) {
                Alert.alert("Thành công", "Đã đặt lịch gửi thông báo đẩy!");
                setPushTitle('');
                setPushBody('');
                setPushUrl('');
                setScheduleDelay('0');
                loadFirebaseData();
              } else {
                Alert.alert("Lỗi", json.error || "Đặt lịch thất bại.");
              }
            } catch (error: any) {
              Alert.alert("Lỗi đặt lịch", error.message || "Không thể kết nối máy chủ.");
            }
            setIsSendingPush(false);
          }
        }
      ]
    );
  };

  const handleDeleteScheduledPush = async (row: number, info: string) => {
    Alert.alert(
      "Xác nhận xóa",
      `Xóa lịch hẹn gửi thông báo [${info}]?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${SCRIPT_URL}?action=delete_scheduled_push&pin=${encodeURIComponent(pin)}&row=${row}`);
              const json = await res.json();
              if (json.success) {
                Alert.alert("Thành công", "Đã xóa lịch gửi.");
                loadFirebaseData();
              } else {
                Alert.alert("Lỗi", json.error || "Xóa thất bại.");
              }
            } catch (error: any) {
              Alert.alert("Lỗi kết nối", error.message || "Không thể kết nối máy chủ.");
            }
          }
        }
      ]
    );
  };

  const addVipDays = async (uid: string, currentExpire: any, daysToAdd: number) => {
    if (auth.currentUser?.email !== 'mquitran@gmail.com') return Alert.alert("Cảnh báo", "Chỉ dành cho Admin");
    Alert.alert('Xác nhận', daysToAdd > 0 ? `Cộng ${daysToAdd} ngày VIP?` : `Xóa VIP?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đồng ý', onPress: async () => {
          try {
            const now = Date.now();
            const currentMillis = getVipMillis(currentExpire);
            const baseTime = currentMillis > now ? currentMillis : now;
            let updateData: any = {};
            if (daysToAdd > 0) updateData.vipExpire = Timestamp.fromMillis(baseTime + (daysToAdd * 24 * 60 * 60 * 1000)); 
            else updateData.vipExpire = null; 
            await updateDoc(doc(db, 'users', uid), updateData);
            Alert.alert("Thành công", "Đã chốt VIP!"); loadFirebaseData();
          } catch (error) { Alert.alert("Lỗi", "Không thể cập nhật."); }
      }}
    ]);
  };

  const handleAddAccount = async () => {
    if (!newAccType || !newAccInfo) return Alert.alert("Lỗi", "Nhập đủ thông tin TK");
    setIsAdding(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=add_account&pin=${encodeURIComponent(pin)}&type=${encodeURIComponent(newAccType)}&account=${encodeURIComponent(newAccInfo)}`);
      const json = await res.json();
      if (json.success) { Alert.alert("Xong", "Đã nạp vào Kho!"); setNewAccInfo(''); handleLoginAdmin(); } 
      else { Alert.alert("Lỗi", json.error); }
    } catch (error) { Alert.alert("Lỗi", "Kết nối thất bại."); }
    setIsAdding(false);
  };

  // 🔴 HÀM XỬ LÝ GIFTCODE (TẠO & XÓA)
  const createNewGiftcode = async () => {
    const code = gcName.trim().toUpperCase();
    const val = parseInt(gcValue);
    const limit = parseInt(gcLimit) || 0;
    
    if (!code || isNaN(val)) return Alert.alert("Lỗi", "Vui lòng nhập Tên Mã và Giá trị");
    setIsCreatingGc(true);
    try {
      const docRef = doc(db, 'giftcodes', code);
      const snap = await getDoc(docRef);
      if (snap.exists()) { Alert.alert("Lỗi", "Tên mã này đã tồn tại!"); } 
      else {
        await setDoc(docRef, { type: gcType, value: val, maxUses: limit, usedCount: 0, usedBy: [], createdAt: serverTimestamp() });
        Alert.alert("Thành công", "Đã tạo mã Giftcode!");
        setGcName(''); setGcValue(''); loadFirebaseData();
      }
    } catch (error: any) { Alert.alert("Lỗi", error.message); }
    setIsCreatingGc(false);
  };

  const handleDeleteGiftcode = (code: string) => {
    Alert.alert('Cảnh báo', `Xóa mã [${code}] vĩnh viễn?`, [
       { text: 'Hủy', style: 'cancel' },
       { text: 'Xóa', style: 'destructive', onPress: async () => {
           await deleteDoc(doc(db, 'giftcodes', code)); loadFirebaseData();
       }}
    ])
  };

  if (!isAuthenticated) {
    return (
      <LinearGradient colors={COLORS.bgGradient} style={styles.loginContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
           <StatusBar style="light" />
           {!isStandaloneAdmin && (
             <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
               <X color="#FFF" size={32} />
             </TouchableOpacity>
           )}
           <View style={[styles.loginBox, SHADOWS.glowDark]}>
              <View style={styles.logoCircle}><ShieldCheck color="#FF453A" size={40} /></View>
              <Text style={styles.loginTitle}>Trung Tâm Điều Hành</Text>
              
              {!firebaseAuthenticated && (
                <>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 10, textAlign: 'center' }}>
                    Đăng nhập tài khoản Admin Firebase
                  </Text>
                  <View style={styles.inputGroup}>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Email Admin..." 
                      placeholderTextColor={COLORS.textMuted} 
                      value={adminEmail} 
                      onChangeText={setAdminEmail} 
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Mật khẩu Admin..." 
                      placeholderTextColor={COLORS.textMuted} 
                      secureTextEntry 
                      value={adminPassword} 
                      onChangeText={setAdminPassword} 
                    />
                  </View>
                  <View style={{ height: 0.8, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%', marginVertical: 12 }} />
                </>
              )}

              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 10, textAlign: 'center' }}>
                Xác thực mã PIN hệ thống
              </Text>
              <View style={styles.inputGroup}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Mã PIN..." 
                  placeholderTextColor={COLORS.textMuted} 
                  secureTextEntry 
                  value={pin} 
                  onChangeText={setPin} 
                />
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={() => handleLoginAdmin()} disabled={isVerifying}>
                {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>XÁC NHẬN</Text>}
              </TouchableOpacity>
           </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isStandaloneAdmin ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft color="#FF453A" size={28} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.menuBtn}>
            <Menu color="#FF453A" size={26} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>ADMIN WORKSPACE</Text>
        <TouchableOpacity onPress={() => loadFirebaseData()}><Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Tải lại</Text></TouchableOpacity>
      </View>

      <View style={styles.subheader}>
        <Text style={styles.subheaderText}>
          📌 {TABS.find(t => t.id === activeTab)?.label}
        </Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* TỔNG QUAN */}
        {activeTab === 'DASHBOARD' && (
          <View>
             <Text style={styles.title}>THỐNG KÊ HỆ THỐNG</Text>
             <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20}}>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(50,215,75,0.1)'}]}><Banknote color="#32D74B" size={18}/></View><Text style={styles.statLabel}>DOANH THU</Text><Text style={[styles.statValue, {color: '#32D74B'}]}>{stats.revenue.toLocaleString('vi-VN')}đ</Text></View>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(10,132,255,0.1)'}]}><Users color="#0A84FF" size={18}/></View><Text style={styles.statLabel}>NGƯỜI DÙNG</Text><Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text></View>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(255,215,0,0.1)'}]}><Crown color="#FFD700" size={18}/></View><Text style={styles.statLabel}>KHÁCH VIP</Text><Text style={styles.statValue}>{stats.totalVips.toLocaleString()}</Text></View>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(175,82,222,0.1)'}]}><Gem color="#AF52DE" size={18}/></View><Text style={styles.statLabel}>TỔNG XU</Text><Text style={[styles.statValue, {color: '#AF52DE'}]}>{stats.totalCoins.toLocaleString()}</Text></View>
                <View style={[styles.statCard, { width: '100%' }]}><View style={[styles.statIconBox, {backgroundColor: 'rgba(255,69,58,0.1)'}]}><Ticket color="#FF453A" size={18}/></View><Text style={styles.statLabel}>ĐƠN MALL CHỜ DUYỆT</Text><Text style={[styles.statValue, {color: '#FF453A'}]}>{allMmoOrders.filter(o => o.status === 'PENDING' && o.isPaid).length} đơn</Text></View>
             </View>

             <Text style={styles.title}>BÁO CÁO KHO TÀI KHOẢN CHUNG</Text>
             {['Spotify', 'Netflix', 'CapCut'].map(type => {
                const data = invStats[type] || { total: 0, available: 0, sold: 0 };
                const percent = data.total > 0 ? Math.round((data.sold / data.total)*100) : 0;
                return (
                  <View key={type} style={styles.invCard}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                      <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>{type}</Text>
                      <Text style={{color: '#32D74B', fontWeight: '900', fontSize: 14}}>{data.available} <Text style={{fontSize: 10, color: '#888'}}>Tồn</Text></Text>
                    </View>
                    <View style={{height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden'}}><View style={{height: '100%', width: `${percent}%`, backgroundColor: '#0A84FF'}} /></View>
                    <Text style={{color: '#888', fontSize: 10, marginTop: 4, textAlign: 'right'}}>Đã bán: {data.sold} / {data.total}</Text>
                  </View>
                )
             })}
          </View>
        )}

        {/* KHÁCH HÀNG */}
        {activeTab === 'MEMBERS' && (
          <View>
            <Text style={styles.title}>DANH SÁCH KHÁCH HÀNG ({usersList.length})</Text>
            
            <View style={[styles.searchBox, { marginBottom: 12 }]}>
              <Search size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
              <TextInput 
                style={styles.searchInputCompact}
                placeholder="Tìm kiếm theo tên hoặc email..."
                placeholderTextColor={COLORS.textMuted}
                value={memberSearchQuery}
                onChangeText={(text) => {
                  setMemberSearchQuery(text);
                  setRenderLimit(30);
                }}
              />
              {memberSearchQuery !== '' && (
                <TouchableOpacity onPress={() => setMemberSearchQuery('')} style={{ padding: 4 }}>
                  <X size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {getFilteredUsers().slice(0, renderLimit).map((u: any, i: number) => {
              const expireMillis = getVipMillis(u.vipExpire);
              const isVipActive = expireMillis > Date.now();
              return (
                <View key={i} style={styles.userCard}>
                  <View style={{marginBottom: 8}}>
                    <Text style={styles.userName}>{u.fullname || u.email}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6}}>
                      {isVipActive ? ( 
                        <View style={styles.vipTag}><Text style={styles.vipTagText}>VIP: {new Date(expireMillis).toLocaleDateString('vi-VN')}</Text></View> 
                      ) : ( 
                        <View style={[styles.vipTag, {backgroundColor: '#333', borderColor: '#555'}]}><Text style={[styles.vipTagText, {color: '#888'}]}>Chưa VIP</Text></View> 
                      )}
                      <Text style={{color: '#AF52DE', fontWeight: 'bold', fontSize: 11}}><Gem size={10} color="#AF52DE" style={{marginBottom: -2}}/> {(u.coins || 0).toLocaleString()} Xu</Text>
                    </View>
                  </View>
                  
                  <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => addVipDays(u.id, u.vipExpire, 1)}><Text style={styles.actionText}>+1 Ngày</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => addVipDays(u.id, u.vipExpire, 7)}><Text style={styles.actionText}>+7 Ngày</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => addVipDays(u.id, u.vipExpire, 30)}><Text style={[styles.actionText, {color: '#FFD700'}]}>+30 Ngày</Text></TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: 'rgba(10,132,255,0.1)', borderColor: 'rgba(10,132,255,0.4)' }]} 
                        onPress={() => {
                          setEditUserUid(u.id);
                          setEditUserEmail(u.email || '');
                          setEditUserCoins(String(u.coins || 0));
                          setEditUserVipDate(isVipActive ? new Date(expireMillis) : null);
                          setIsUserModalVisible(true);
                        }}
                      >
                        <Text style={[styles.actionText, {color: '#0A84FF'}]}>Sửa Nâng Cao</Text>
                      </TouchableOpacity>
                  </View>
                </View>
              )
            })}

            {getFilteredUsers().length > renderLimit && (
              <TouchableOpacity 
                style={[styles.actionBtn, { marginTop: 5, marginBottom: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.02)' }]} 
                onPress={() => setRenderLimit(prev => prev + 30)}
              >
                <Text style={styles.actionText}>Tải thêm khách hàng (+30)...</Text>
              </TouchableOpacity>
            )}

            {getFilteredUsers().length === 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginVertical: 20, fontSize: 12 }}>Không tìm thấy khách hàng nào.</Text>
            )}
          </View>
        )}

        {/* LỊCH SỬ NẠP */}
        {activeTab === 'TRANSACTIONS' && (
          <View>
            <Text style={styles.title}>LỊCH SỬ NẠP TIỀN</Text>
            {transactionsList.length === 0 ? (
              <Text style={{color: '#888', textAlign: 'center', marginTop: 20, fontSize: 13}}>Chưa có giao dịch nạp tiền nào.</Text>
            ) : (
              transactionsList.map((tx, idx) => (
                <View key={idx} style={[styles.userCard, { padding: 12, marginBottom: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>{tx.orderId}</Text>
                    <Text style={{ color: '#32D74B', fontWeight: 'bold', fontSize: 14 }}>+{tx.amount.toLocaleString()}đ</Text>
                  </View>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 4 }}>UID: {tx.uid}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ color: '#555', fontSize: 10 }}>{new Date(tx.time).toLocaleString('vi-VN')}</Text>
                    <Text style={{ color: tx.status === 'CLAIMED' ? '#32D74B' : '#FF9500', fontSize: 11, fontWeight: 'bold' }}>
                      {tx.status} (+{tx.coins} Xu)
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* DUYỆT ĐƠN MALL */}
        {activeTab === 'MALL_ORDERS' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.title}>QUẢN LÝ ĐƠN HÀNG MALL</Text>
              <TouchableOpacity 
                style={{ backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                onPress={bulkFulfillOrders}
              >
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                  Duyệt hàng loạt ({selectedMmoOrders.size})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filter buttons */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              <TouchableOpacity 
                style={[styles.typeBtn, activeMmoOrderFilter === 'PENDING_PAID' && { borderColor: '#32D74B', backgroundColor: 'rgba(50,215,75,0.1)' }]} 
                onPress={() => setActiveMmoOrderFilter('PENDING_PAID')}
              >
                <Text style={[styles.typeBtnText, activeMmoOrderFilter === 'PENDING_PAID' && { color: '#32D74B' }]}>Chờ duyệt</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, activeMmoOrderFilter === 'COMPLETED' && { borderColor: '#0A84FF', backgroundColor: 'rgba(10,132,255,0.1)' }]} 
                onPress={() => setActiveMmoOrderFilter('COMPLETED')}
              >
                <Text style={[styles.typeBtnText, activeMmoOrderFilter === 'COMPLETED' && { color: '#0A84FF' }]}>Đã xong</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, activeMmoOrderFilter === 'ALL' && { borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.05)' }]} 
                onPress={() => setActiveMmoOrderFilter('ALL')}
              >
                <Text style={[styles.typeBtnText, activeMmoOrderFilter === 'ALL' && { color: '#FFF' }]}>Tất cả</Text>
              </TouchableOpacity>
            </View>

            {/* Select all & Search */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 8, borderWidth: 0.8, borderColor: COLORS.border }}
                onPress={toggleSelectAllOrders}
              >
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Chọn Tất Cả</Text>
              </TouchableOpacity>
              
              <View style={[styles.searchBox, { flex: 1, height: 34 }]}>
                <Search size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <TextInput 
                  style={[styles.searchInputCompact, { fontSize: 11 }]}
                  placeholder="Tìm kiếm mã đơn hoặc UID..."
                  placeholderTextColor={COLORS.textMuted}
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                />
              </View>
            </View>

            {getFilteredMmoOrders().length === 0 ? (
              <Text style={{color: '#888', textAlign: 'center', marginTop: 20}}>Không tìm thấy đơn hàng nào.</Text>
            ) : (
              getFilteredMmoOrders().map((o, idx) => {
                const isSelected = selectedMmoOrders.has(o.row);
                return (
                  <View key={idx} style={[styles.userCard, isSelected && { borderColor: COLORS.danger, backgroundColor: 'rgba(255, 69, 58, 0.03)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <TouchableOpacity 
                          style={{
                            width: 18, 
                            height: 18, 
                            borderRadius: 4, 
                            borderWidth: 1.5, 
                            borderColor: isSelected ? COLORS.danger : '#555',
                            backgroundColor: isSelected ? COLORS.danger : 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={() => toggleSelectOrder(o.row)}
                        >
                          {isSelected && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                        </TouchableOpacity>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>{o.orderId}</Text>
                      </View>
                      
                      <View style={{
                        backgroundColor: o.status === 'PENDING' ? 'rgba(255, 149, 0, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4
                      }}>
                        <Text style={{ color: o.status === 'PENDING' ? '#FF9500' : '#30D158', fontSize: 9, fontWeight: 'bold' }}>
                          {o.status} ({o.isPaid ? 'ĐÃ T.TOÁN' : 'CHƯA THANH TOÁN'})
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={{ color: '#8E8E93', fontSize: 12 }}>SP: {o.productName} (SL: {o.amount})</Text>
                    <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>Giá: {o.price ? o.price.toLocaleString() : 0}đ | UID: {o.uid}</Text>
                    {o.accountData ? (
                      <Text style={{ color: '#30D158', fontSize: 11, fontFamily: 'monospace', marginTop: 4, backgroundColor: 'rgba(48,209,88,0.05)', padding: 6, borderRadius: 6 }}>
                        Acc: {o.accountData}
                      </Text>
                    ) : null}
                    
                    <View style={[styles.actionRow, { marginTop: 10 }]}>
                      {o.status === 'PENDING' && (
                        <>
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: 'rgba(50,215,75,0.1)', borderColor: 'rgba(50,215,75,0.4)' }]} 
                            onPress={() => fulfillOrderAPI(o.row, o.productId, o.amount)}
                          >
                            <Text style={[styles.actionText, { color: '#32D74B' }]}>Duyệt API</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: 'rgba(10,132,255,0.1)', borderColor: 'rgba(10,132,255,0.4)' }]} 
                            onPress={() => {
                              setManualFulfillRow(o.row);
                              setManualAccountText('');
                              setIsManualModalVisible(true);
                            }}
                          >
                            <Text style={[styles.actionText, { color: '#0A84FF' }]}>Duyệt Tay</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: 'rgba(255,69,58,0.1)', borderColor: 'rgba(255,69,58,0.4)' }]} 
                        onPress={() => deleteOrder(o.row)}
                      >
                        <Text style={[styles.actionText, { color: '#FF453A' }]}>Xóa Đơn</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* KHO SẢN PHẨM */}
        {activeTab === 'PRODUCTS' && (
          <View>
            <Text style={styles.title}>KHO CẤU HÌNH SẢN PHẨM MMO</Text>
            
            <View style={{ gap: 8, marginBottom: 12 }}>
              <View style={styles.searchBox}>
                <Search size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                <TextInput 
                  style={styles.searchInputCompact}
                  placeholder="Tìm kiếm Tên SP, ID hoặc Danh Mục..."
                  placeholderTextColor={COLORS.textMuted}
                  value={productSearchQuery}
                  onChangeText={(text) => {
                    setProductSearchQuery(text);
                    setProductRenderLimit(30);
                  }}
                />
              </View>
              
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: 'bold' }}>Danh mục:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <TouchableOpacity 
                    style={[styles.typeBtn, productCatFilter === 'all' && { borderColor: COLORS.primary }]}
                    onPress={() => { setProductCatFilter('all'); setProductRenderLimit(30); }}
                  >
                    <Text style={[styles.typeBtnText, productCatFilter === 'all' && { color: COLORS.primary }]}>Tất cả</Text>
                  </TouchableOpacity>
                  {Array.from(new Set(mmoRawProducts.map(p => p.cat || 'Khác'))).map(catName => (
                    <TouchableOpacity 
                      key={catName} 
                      style={[styles.typeBtn, productCatFilter === catName && { borderColor: COLORS.primary }]}
                      onPress={() => { setProductCatFilter(catName); setProductRenderLimit(30); }}
                    >
                      <Text style={[styles.typeBtnText, productCatFilter === catName && { color: COLORS.primary }]}>{catName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Bulk actions */}
            <View style={[styles.userCard, { padding: 10, marginBottom: 12 }]}>
              <Text style={{ color: '#FF9500', fontWeight: 'bold', fontSize: 11, marginBottom: 8 }}>ĐỔI GIÁ HÀNG LOẠT (%) CHO SP ĐÃ CHỌN ({selectedConfigs.size})</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <TextInput 
                  style={[styles.addInput, { width: 55, height: 34, marginBottom: 0, textAlign: 'center', paddingHorizontal: 0 }]}
                  placeholder="%"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={bulkPercent}
                  onChangeText={setBulkPercent}
                />
                <TouchableOpacity 
                  style={[styles.typeBtn, { height: 34, paddingHorizontal: 8 }]}
                  onPress={() => setBulkPriceTarget(prev => prev === 'price' ? 'fakePrice' : 'price')}
                >
                  <Text style={{ color: '#FFF', fontSize: 11 }}>
                    {bulkPriceTarget === 'price' ? 'Giá Bán' : 'Giá Gạch'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ backgroundColor: '#30D158', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => applyBulkDiscount('up')}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ backgroundColor: '#FF453A', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => applyBulkDiscount('down')}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#0A84FF', fontWeight: 'bold', fontSize: 11, marginBottom: 8 }}>GỘP CÁC SP ĐÃ CHỌN VÀO DANH MỤC MỚI</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput 
                  style={[styles.addInput, { flex: 1, height: 34, marginBottom: 0, fontSize: 11 }]}
                  placeholder="Tên danh mục mới..."
                  placeholderTextColor={COLORS.textMuted}
                  value={bulkCatInput}
                  onChangeText={setBulkCatInput}
                />
                <TouchableOpacity 
                  style={{ backgroundColor: '#0A84FF', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }}
                  onPress={bulkMoveCategory}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>GỘP</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Select all checkbox */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 8, borderWidth: 0.8, borderColor: COLORS.border, marginBottom: 10, alignSelf: 'flex-start' }}
              onPress={toggleSelectAllConfigs}
            >
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Chọn Tất Cả</Text>
            </TouchableOpacity>

            {/* Config list */}
            {getFilteredMmoProducts().length === 0 ? (
              <Text style={{color: '#888', textAlign: 'center', marginTop: 20}}>Không tìm thấy sản phẩm nào.</Text>
            ) : (
              getFilteredMmoProducts().slice(0, productRenderLimit).map((p, idx) => {
                const id = String(p.id);
                const conf = mmoConfigState[id] || {};
                const isSelected = selectedConfigs.has(id);
                
                return (
                  <View key={id} style={[styles.userCard, isSelected && { borderColor: '#0A84FF', backgroundColor: 'rgba(10, 132, 255, 0.03)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <TouchableOpacity 
                          style={{
                            width: 18, 
                            height: 18, 
                            borderRadius: 4, 
                            borderWidth: 1.5, 
                            borderColor: isSelected ? '#0A84FF' : '#555',
                            backgroundColor: isSelected ? '#0A84FF' : 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={() => toggleSelectConfig(id)}
                        >
                          {isSelected && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                        </TouchableOpacity>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>
                          ID: {id} - {conf.name || p.name}
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#8E8E93', fontSize: 10, marginBottom: 2 }}>Giá bán (đ):</Text>
                          <TextInput 
                            style={[styles.addInput, { height: 32, marginBottom: 0, paddingHorizontal: 8, fontSize: 11 }]}
                            keyboardType="numeric"
                            value={String(conf.price !== undefined ? conf.price : (p.price || 0))}
                            onChangeText={(txt) => updateProductConfig(id, 'price', parseInt(txt) || 0)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#8E8E93', fontSize: 10, marginBottom: 2 }}>Giá gạch (đ):</Text>
                          <TextInput 
                            style={[styles.addInput, { height: 32, marginBottom: 0, paddingHorizontal: 8, fontSize: 11 }]}
                            keyboardType="numeric"
                            placeholder="Để trống"
                            placeholderTextColor={COLORS.textMuted}
                            value={String(conf.fakePrice || '')}
                            onChangeText={(txt) => updateProductConfig(id, 'fakePrice', parseInt(txt) || '')}
                          />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#8E8E93', fontSize: 10, marginBottom: 2 }}>Danh mục:</Text>
                          <TextInput 
                            style={[styles.addInput, { height: 32, marginBottom: 0, paddingHorizontal: 8, fontSize: 11 }]}
                            value={conf.cat || p.cat || 'Khác'}
                            onChangeText={(txt) => updateProductConfig(id, 'cat', txt)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#8E8E93', fontSize: 10, marginBottom: 2 }}>Kho hàng:</Text>
                          <TextInput 
                            style={[styles.addInput, { height: 32, marginBottom: 0, paddingHorizontal: 8, fontSize: 11 }]}
                            keyboardType="numeric"
                            value={String(conf.stock !== undefined ? conf.stock : (p.stock || 0))}
                            onChangeText={(txt) => updateProductConfig(id, 'stock', parseInt(txt) || 0)}
                          />
                        </View>
                      </View>

                      <View>
                        <Text style={{ color: '#8E8E93', fontSize: 10, marginBottom: 2 }}>Mô tả sản phẩm:</Text>
                        <TextInput 
                          style={[styles.addInput, { height: 32, marginBottom: 0, paddingHorizontal: 8, fontSize: 11 }]}
                          placeholder="Mô tả..."
                          placeholderTextColor={COLORS.textMuted}
                          value={conf.desc || ''}
                          onChangeText={(txt) => updateProductConfig(id, 'desc', txt)}
                        />
                      </View>

                      <View>
                        <Text style={{ color: '#8E8E93', fontSize: 10, marginBottom: 2 }}>Icon URL:</Text>
                        <TextInput 
                          style={[styles.addInput, { height: 32, marginBottom: 0, paddingHorizontal: 8, fontSize: 11 }]}
                          placeholder="https://..."
                          placeholderTextColor={COLORS.textMuted}
                          value={conf.icon || ''}
                          onChangeText={(txt) => updateProductConfig(id, 'icon', txt)}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#FFF', fontSize: 12 }}>Ẩn sản phẩm:</Text>
                          <Switch 
                            value={conf.isHidden === true}
                            onValueChange={(val) => updateProductConfig(id, 'isHidden', val)}
                          />
                        </View>
                        
                        <TouchableOpacity 
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 6 }}
                          onPress={() => {
                            Alert.alert("Xác nhận", "Xóa sản phẩm này khỏi cấu hình local? (Bấm Lưu máy chủ sau đó để đồng bộ)", [
                              { text: "Hủy", style: "cancel" },
                              { text: "Xóa", style: "destructive", onPress: () => {
                                  setMmoRawProducts(prev => prev.filter(item => String(item.id) !== String(id)));
                                  setMmoConfigState((prev: any) => {
                                    const next = { ...prev };
                                    delete next[id];
                                    return next;
                                  });
                                  setHasUnsavedChanges(true);
                                }
                              }
                            ]);
                          }}
                        >
                          <Text style={{ color: '#FF453A', fontSize: 11, fontWeight: 'bold' }}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {getFilteredMmoProducts().length > productRenderLimit && (
              <TouchableOpacity 
                style={[styles.actionBtn, { marginTop: 5, marginBottom: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.02)' }]} 
                onPress={() => setProductRenderLimit(prev => prev + 30)}
              >
                <Text style={styles.actionText}>Tải thêm sản phẩm (+30)...</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* QUẢN LÝ DANH MỤC */}
        {activeTab === 'CATEGORIES' && (
          <View>
            <Text style={styles.title}>QUẢN LÝ DANH MỤC CHUYÊN SÂU</Text>
            
            <View style={{ flexDirection: 'row', gap: 10, minHeight: 350 }}>
              {/* Left Side: Category List */}
              <View style={{ width: '40%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 0.8, borderColor: COLORS.border, padding: 8 }}>
                <Text style={{ color: '#8E8E93', fontSize: 9, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>Danh mục</Text>
                <ScrollView contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator={false}>
                  {Array.from(new Set(mmoRawProducts.map(p => p.cat || 'Khác'))).map(cName => {
                    const isSelected = selectedCatName === cName;
                    return (
                      <TouchableOpacity 
                        key={cName}
                        style={{
                          backgroundColor: isSelected ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSelected ? COLORS.primary : COLORS.border,
                          borderWidth: 0.8,
                          borderRadius: 8,
                          padding: 10
                        }}
                        onPress={() => {
                          setSelectedCatName(cName);
                          const meta = categoryMetadataMap[cName] || {};
                          setCatManagerIcon(meta.icon || '');
                          setCatManagerOrder(String(meta.order !== undefined ? meta.order : 999));
                          setCatManagerHot(meta.hot === true);
                          setCatManagerHidden(meta.hidden === true);
                        }}
                      >
                        <Text style={{ color: isSelected ? COLORS.primary : '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                          {cName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Right Side: Editors */}
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 0.8, borderColor: COLORS.border, padding: 12 }}>
                {selectedCatName ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
                      THIẾT LẬP: {selectedCatName}
                    </Text>
                    
                    <Text style={{ color: '#8E8E93', fontSize: 10 }}>Link Icon Danh Mục:</Text>
                    <TextInput 
                      style={[styles.addInput, { height: 34, marginBottom: 0, fontSize: 11 }]}
                      placeholder="https://..."
                      placeholderTextColor={COLORS.textMuted}
                      value={catManagerIcon}
                      onChangeText={setCatManagerIcon}
                    />

                    <Text style={{ color: '#8E8E93', fontSize: 10 }}>Thứ Tự Sắp Xếp (Số):</Text>
                    <TextInput 
                      style={[styles.addInput, { height: 34, marginBottom: 0, fontSize: 11 }]}
                      keyboardType="numeric"
                      placeholder="VD: 1, 2, 3"
                      placeholderTextColor={COLORS.textMuted}
                      value={catManagerOrder}
                      onChangeText={setCatManagerOrder}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 11 }}>Đẩy Lên Hot (HOT):</Text>
                      <Switch 
                        value={catManagerHot}
                        onValueChange={setCatManagerHot}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 11 }}>Ẩn Danh Mục:</Text>
                      <Switch 
                        value={catManagerHidden}
                        onValueChange={setCatManagerHidden}
                      />
                    </View>

                    <TouchableOpacity 
                      style={[styles.submitBtn, { height: 36, marginTop: 10, backgroundColor: COLORS.primary }]}
                      onPress={saveCategorySettings}
                    >
                      <Text style={styles.submitBtnText}>LƯU CẤU HÌNH DM</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#888', textAlign: 'center', fontSize: 12 }}>
                      Vui lòng chọn danh mục bên trái
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* THÊM SẢN PHẨM */}
        {activeTab === 'ADD_PRODUCT' && (
          <View>
            <Text style={styles.title}>KÉO HÀNG ẨN / THÊM SP TAY</Text>
            
            {/* Link scanner */}
            <View style={[styles.userCard, { padding: 12, backgroundColor: 'rgba(255,215,0,0.02)', borderColor: 'rgba(255,215,0,0.2)' }]}>
              <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>BỘ QUÉT LINK / ID KINGMMO</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput 
                  style={[styles.addInput, { flex: 1, height: 38, marginBottom: 0, fontSize: 12 }]}
                  placeholder="Dán Link SP hoặc ID KingMMO..."
                  placeholderTextColor={COLORS.textMuted}
                  value={checkKingMmoId}
                  onChangeText={setCheckKingMmoId}
                />
                <TouchableOpacity 
                  style={{ backgroundColor: '#FFD700', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }}
                  onPress={handleCheckKingMmo}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>TÌM</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom product form */}
            <View style={[styles.userCard, { marginTop: 12 }]}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginBottom: 12 }}>FORM THÊM SẢN PHẨM THỦ CÔNG</Text>
              
              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Tên Sản Phẩm *:</Text>
              <TextInput 
                style={styles.addInput}
                placeholder="Ví dụ: Tài khoản Netflix 1 Tháng..."
                placeholderTextColor={COLORS.textMuted}
                value={customFormName}
                onChangeText={setCustomFormName}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Danh mục *:</Text>
                  <TextInput 
                    style={styles.addInput}
                    placeholder="VD: Spotify, Netflix..."
                    placeholderTextColor={COLORS.textMuted}
                    value={customFormCat}
                    onChangeText={setCustomFormCat}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Kho hàng:</Text>
                  <TextInput 
                    style={styles.addInput}
                    keyboardType="numeric"
                    value={customFormStock}
                    onChangeText={setCustomFormStock}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Giá bán (đ) *:</Text>
                  <TextInput 
                    style={styles.addInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    value={customFormPrice}
                    onChangeText={setCustomFormPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Giá gạch cũ:</Text>
                  <TextInput 
                    style={styles.addInput}
                    keyboardType="numeric"
                    placeholder="Tính tự động +30%"
                    placeholderTextColor={COLORS.textMuted}
                    value={customFormFakePrice}
                    onChangeText={setCustomFormFakePrice}
                  />
                </View>
              </View>

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Link Ảnh Icon (URL):</Text>
              <TextInput 
                style={styles.addInput}
                placeholder="https://..."
                placeholderTextColor={COLORS.textMuted}
                value={customFormIcon}
                onChangeText={setCustomFormIcon}
              />

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Mô tả chi tiết:</Text>
              <TextInput 
                style={[styles.textArea, { height: 80 }]}
                placeholder="Nhập mô tả sản phẩm..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={customFormDesc}
                onChangeText={setCustomFormDesc}
              />

              <TouchableOpacity 
                style={[styles.submitBtn, { marginTop: 15, backgroundColor: '#AF52DE' }]}
                onPress={() => {
                  if (!customFormName.trim() || !customFormPrice.trim()) {
                    return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Tên và Giá bán sản phẩm.");
                  }
                  
                  let parsedId = checkKingMmoId.trim().match(/\d+/);
                  let finalId = parsedId ? parsedId[0] : `CUSTOM_${Date.now()}`;
                  
                  setMmoConfigState((prev: any) => {
                    const next = { ...prev };
                    next[finalId] = {
                      name: customFormName,
                      cat: customFormCat || 'Khác',
                      price: parseInt(customFormPrice) || 0,
                      fakePrice: customFormFakePrice ? parseInt(customFormFakePrice) : Math.round((parseInt(customFormPrice) || 0) * 1.3),
                      icon: customFormIcon,
                      stock: parseInt(customFormStock) || 999,
                      desc: customFormDesc,
                      isHidden: false
                    };
                    return next;
                  });
                  
                  setMmoRawProducts(prev => [
                    {
                      id: finalId,
                      name: customFormName,
                      cat: customFormCat || 'Khác',
                      price: parseInt(customFormPrice) || 0,
                      stock: parseInt(customFormStock) || 999
                    },
                    ...prev
                  ]);
                  
                  setHasUnsavedChanges(true);
                  Alert.alert("Thành công", `Đã thêm sản phẩm ID: ${finalId} vào danh sách local. Hãy nhấn "Lưu thay đổi máy chủ" để cập nhật lên Sheets.`);
                  
                  setCheckKingMmoId('');
                  setCustomFormName('');
                  setCustomFormCat('');
                  setCustomFormStock('999');
                  setCustomFormPrice('');
                  setCustomFormFakePrice('');
                  setCustomFormIcon('');
                  setCustomFormDesc('');
                }}
              >
                <Text style={styles.submitBtnText}>THÊM VÀO BẢNG CHỜ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* DEAL HOT */}
        {activeTab === 'DEAL_HOT' && (
          <View>
            <Text style={styles.title}>CẤU HÌNH DEAL HOT TRANG CHỦ</Text>
            
            <View style={[styles.userCard, { backgroundColor: 'rgba(255,149,0,0.02)', borderColor: 'rgba(255,149,0,0.2)' }]}>
              <Text style={{ color: '#FF9500', fontWeight: 'bold', fontSize: 12, marginBottom: 12 }}>BANNER DEAL HOT NỔI BẬT</Text>
              
              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>ID Sản Phẩm Muốn Đẩy Lên Deal *:</Text>
              <TextInput 
                style={styles.addInput}
                placeholder="VD: 9518"
                placeholderTextColor={COLORS.textMuted}
                value={dealTargetId}
                onChangeText={setDealTargetId}
              />

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Tên Deal (Tùy chỉnh tiêu đề) *:</Text>
              <TextInput 
                style={styles.addInput}
                placeholder="VD: Spotify Giá Hủy Diệt 1 Ngày Duy Nhất..."
                placeholderTextColor={COLORS.textMuted}
                value={dealName}
                onChangeText={setDealName}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Giá Deal (VNĐ) *:</Text>
                  <TextInput 
                    style={styles.addInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    value={dealPrice}
                    onChangeText={setDealPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Thời Gian Kết Thúc Deal *:</Text>
                  <TextInput 
                    style={styles.addInput}
                    placeholder="VD: 2026-06-17T23:59:00"
                    placeholderTextColor={COLORS.textMuted}
                    value={dealEndTime}
                    onChangeText={setDealEndTime}
                  />
                </View>
              </View>

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Link Ảnh Bìa (Vuông):</Text>
              <TextInput 
                style={styles.addInput}
                placeholder="https://..."
                placeholderTextColor={COLORS.textMuted}
                value={dealIcon}
                onChangeText={setDealIcon}
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity 
                  style={{ backgroundColor: 'rgba(255,69,58,0.1)', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', borderWidth: 0.8, borderColor: 'rgba(255,69,58,0.4)' }}
                  onPress={() => {
                    setMmoConfigState((prev: any) => {
                      const next = { ...prev };
                      next['DEAL___HOT'] = { name: '', price: 0, icon: '', desc: '', cat: '' };
                      return next;
                    });
                    setDealTargetId('');
                    setDealName('');
                    setDealPrice('');
                    setDealEndTime('');
                    setDealIcon('');
                    setHasUnsavedChanges(true);
                    Alert.alert("Thành công", "Đã xóa Deal Hot khỏi cấu hình local. Hãy bấm Lưu máy chủ để cập nhật.");
                  }}
                >
                  <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: 'bold' }}>Tắt Deal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#FF9500', height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => {
                    if (!dealTargetId.trim() || !dealName.trim() || !dealPrice.trim() || !dealEndTime.trim()) {
                      return Alert.alert("Lỗi", "Vui lòng điền đầy đủ các trường yêu cầu.");
                    }
                    
                    setMmoConfigState((prev: any) => {
                      const next = { ...prev };
                      next['DEAL___HOT'] = {
                        name: dealName,
                        price: parseInt(dealPrice) || 0,
                        icon: dealIcon,
                        desc: dealEndTime, 
                        cat: dealTargetId 
                      };
                      return next;
                    });
                    
                    setHasUnsavedChanges(true);
                    Alert.alert("Thành công", "Đã lưu Deal Hot locally. Hãy nhấn Lưu máy chủ ở cuối trang để đồng bộ.");
                  }}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>LƯU DEAL HOT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* TAB: KHO APPLE ID */}
        {activeTab === 'KHOTK' && (
          <View>
            <Text style={styles.title}>NẠP KHO APPLE ID</Text>
            <View style={styles.userCard}>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 15}}>
                {['Spotify', 'Netflix', 'CapCut'].map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, newAccType === t && styles.typeBtnActive]} onPress={() => setNewAccType(t)}><Text style={[styles.typeBtnText, newAccType === t && {color: '#FFF'}]}>{t}</Text></TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.addInput, {marginBottom: 15}]} placeholder="Email | Mật khẩu..." placeholderTextColor={COLORS.textMuted} value={newAccInfo} onChangeText={setNewAccInfo} multiline/>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddAccount} disabled={isAdding}>{isAdding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>BƠM VÀO KHO HỆ THỐNG</Text>}</TouchableOpacity>
            </View>
            <Text style={styles.title}>KHO GẦN ĐÂY</Text>
            <View style={{backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#222', overflow: 'hidden'}}>
               {dataKho.slice(-5).reverse().map((row, idx) => { if (idx === dataKho.length - 1) return null; return ( <View key={idx} style={{flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderBottomColor: '#222'}}><View><Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>{row[0]}</Text><Text style={{color: '#8E8E93', fontSize: 11, marginTop: 3}}>{row[1]}</Text></View><Text style={{color: row[2] === 'SẴN SÀNG' ? '#32D74B' : '#FF453A', fontSize: 11, fontWeight: 'bold'}}>{row[2]}</Text></View> ) })}
            </View>
          </View>
        )}

        {/* GIFTCODES */}
        {activeTab === 'GIFTCODES' && (
          <View>
            <Text style={styles.title}>TẠO MÃ KHUYẾN MÃI (GIFTCODE)</Text>
            <View style={styles.userCard}>
               <TextInput style={styles.addInput} placeholder="Tên mã (VD: TANG50XU)" placeholderTextColor={COLORS.textMuted} value={gcName} onChangeText={setGcName} autoCapitalize="characters"/>
               
               <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                 <TouchableOpacity style={[styles.typeBtn, gcType === 'coins' && {borderColor: '#AF52DE', backgroundColor: 'rgba(175,82,222,0.1)'}]} onPress={() => setGcType('coins')}><Gem color={gcType === 'coins' ? '#AF52DE' : '#888'} size={16}/><Text style={[styles.typeBtnText, gcType === 'coins' && {color: '#AF52DE'}]}>Tặng Xu</Text></TouchableOpacity>
                 <TouchableOpacity style={[styles.typeBtn, gcType === 'vip' && {borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)'}]} onPress={() => setGcType('vip')}><Crown color={gcType === 'vip' ? '#FFD700' : '#888'} size={16}/><Text style={[styles.typeBtnText, gcType === 'vip' && {color: '#FFD700'}]}>Tặng VIP</Text></TouchableOpacity>
               </View>

               <TextInput style={styles.addInput} placeholder={gcType === 'coins' ? "Số xu tặng (VD: 50)" : "Số ngày VIP tặng (VD: 3)"} placeholderTextColor={COLORS.textMuted} value={gcValue} onChangeText={setGcValue} keyboardType="numeric"/>
               <TextInput style={styles.addInput} placeholder="Giới hạn lượt dùng (0 = Vô hạn)" placeholderTextColor={COLORS.textMuted} value={gcLimit} onChangeText={setGcLimit} keyboardType="numeric"/>
               
               <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#0A84FF'}]} onPress={createNewGiftcode} disabled={isCreatingGc}>{isCreatingGc ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>PHÁT HÀNH MÃ</Text>}</TouchableOpacity>
            </View>

            <Text style={styles.title}>MÃ ĐANG HOẠT ĐỘNG</Text>
            {giftcodesList.length === 0 && <Text style={{color: '#888', textAlign: 'center', marginTop: 10}}>Chưa có mã nào.</Text>}
            {giftcodesList.map((gc, idx) => (
              <View key={idx} style={styles.gcCard}>
                 <View style={{flex: 1}}>
                    <Text style={{color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 5}}>{gc.id}</Text>
                    <Text style={{color: gc.type === 'coins' ? '#AF52DE' : '#FFD700', fontWeight: 'bold', fontSize: 13}}>
                      {gc.type === 'coins' ? `Tặng ${gc.value} Xu` : `Tặng ${gc.value} Ngày VIP`}
                    </Text>
                    <Text style={{color: '#888', fontSize: 12, marginTop: 5}}>Đã dùng: {gc.usedCount} / {gc.maxUses === 0 ? 'Vô hạn' : gc.maxUses}</Text>
                 </View>
                 <TouchableOpacity style={{padding: 15, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 12}} onPress={() => handleDeleteGiftcode(gc.id)}><Trash2 color="#FF453A" size={20}/></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* THÔNG BÁO PUSH */}
        {activeTab === 'PUSH' && (
          <View>
            <Text style={styles.title}>GỬI THÔNG BÁO MÁY (PUSH NOTIFICATIONS)</Text>
            <View style={styles.userCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 0.8, borderColor: COLORS.border }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Thiết bị đã đăng ký:</Text>
                <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 16 }}>{registeredDeviceCount} thiết bị</Text>
              </View>

              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Tiêu đề thông báo đẩy:</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Nhập tiêu đề push..." 
                placeholderTextColor={COLORS.textMuted} 
                value={pushTitle} 
                onChangeText={setPushTitle} 
              />

              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Nội dung thông báo đẩy:</Text>
              <TextInput 
                style={styles.textArea} 
                placeholder="Nhập nội dung push..." 
                placeholderTextColor={COLORS.textMuted} 
                multiline 
                value={pushBody} 
                onChangeText={setPushBody} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>URL hành động đính kèm (Ví dụ: link tải IPA):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Link hành động (nếu có)..." 
                placeholderTextColor={COLORS.textMuted} 
                value={pushUrl} 
                onChangeText={setPushUrl} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 10, fontSize: 13, fontWeight: '700'}}>Hẹn giờ gửi thông báo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 5 }}>
                {[
                  { label: 'Gửi ngay', value: '0' },
                  { label: '5 Phút', value: '5' },
                  { label: '15 Phút', value: '15' },
                  { label: '1 Giờ', value: '60' },
                  { label: '3 Giờ', value: '180' },
                  { label: '1 Ngày', value: '1440' },
                  { label: 'Tự chọn', value: 'custom' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.typeBtn, 
                      { paddingHorizontal: 12, height: 38 },
                      scheduleDelay === opt.value && { borderColor: COLORS.primary, backgroundColor: 'rgba(255, 69, 58, 0.1)' }
                    ]}
                    onPress={() => setScheduleDelay(opt.value)}
                  >
                    <Text style={[
                      styles.typeBtnText, 
                      { fontSize: 12 },
                      scheduleDelay === opt.value && { color: COLORS.primary }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {scheduleDelay === 'custom' ? (
                <View style={[styles.customTimeContainer, { borderColor: COLORS.border }]}>
                  <Text style={{ color: '#8E8E93', marginBottom: 12, fontSize: 13, fontWeight: '700' }}>Tùy chỉnh thời gian hẹn gửi:</Text>
                  
                  {Platform.OS === 'web' ? (
                    <Text style={{ color: '#FFF', textAlign: 'center', marginVertical: 10 }}>Không hỗ trợ chọn ngày trên web</Text>
                  ) : Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={customDate}
                      mode="datetime"
                      display="inline"
                      themeVariant="dark"
                      minimumDate={new Date()}
                      onChange={(event, date) => {
                        if (date) setCustomDate(date);
                      }}
                      style={{ alignSelf: 'center', marginTop: 10 }}
                    />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                      <TouchableOpacity 
                        style={styles.pickerTriggerBtn} 
                        onPress={() => { setPickerMode('date'); setShowDatePicker(true); }}
                      >
                        <Text style={styles.pickerTriggerText}>📅 {customDate.toLocaleDateString('vi-VN')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.pickerTriggerBtn} 
                        onPress={() => { setPickerMode('time'); setShowDatePicker(true); }}
                      >
                        <Text style={styles.pickerTriggerText}>⏰ {customDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                      </TouchableOpacity>
                      
                      {showDatePicker && (
                        <DateTimePicker
                          value={customDate}
                          mode={pickerMode}
                          is24Hour={true}
                          display="default"
                          minimumDate={new Date()}
                          onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) setCustomDate(date);
                          }}
                        />
                      )}
                    </View>
                  )}

                  {/* Hiển thị tóm tắt thời gian dự kiến gửi */}
                  <View style={styles.timeSummaryBox}>
                    <Text style={styles.timeSummaryText}>
                      Thời gian dự kiến: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
                        {customDate.toLocaleString('vi-VN')}
                      </Text>
                    </Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.submitBtn, {marginTop: 20, backgroundColor: scheduleDelay === '0' ? COLORS.danger : '#FF9500'}]} 
                onPress={scheduleDelay === '0' ? handleSendPushNotifications : handleSchedulePush}
                disabled={isSendingPush}
              >
                {isSendingPush ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {scheduleDelay === '0' ? 'PHÁT THÔNG BÁO ĐẨY HÀNG LOẠT' : 'ĐẶT LỊCH HẸN GIỜ GỬI'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>DANH SÁCH LỊCH HẸN GỬI THÔNG BÁO</Text>
            {scheduledPushes.length === 0 ? (
              <View style={styles.userCard}>
                <Text style={{ color: '#8E8E93', textAlign: 'center', fontSize: 13 }}>Không có lịch hẹn nào đang có.</Text>
              </View>
            ) : (
              scheduledPushes.map((item, idx) => {
                const isPending = item.status === 'PENDING';
                return (
                  <View key={idx} style={[styles.userCard, { padding: 15, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15, flex: 1, marginRight: 10 }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={{
                        backgroundColor: isPending ? 'rgba(255, 149, 0, 0.12)' : item.status.startsWith('FAILED') ? 'rgba(255, 69, 58, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 0.5,
                        borderColor: isPending ? 'rgba(255, 149, 0, 0.4)' : item.status.startsWith('FAILED') ? 'rgba(255, 69, 58, 0.4)' : 'rgba(48, 209, 88, 0.4)'
                      }}>
                        <Text style={{ color: isPending ? '#FF9500' : item.status.startsWith('FAILED') ? '#FF453A' : '#30D158', fontSize: 10, fontWeight: 'bold' }}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={{ color: '#8E8E93', fontSize: 13, marginBottom: 10 }} numberOfLines={2}>
                      {item.body}
                    </Text>

                    {item.url ? (
                      <Text style={{ color: COLORS.primary, fontSize: 11, marginBottom: 10 }} numberOfLines={1}>
                        Liên kết: {item.url}
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <View>
                        <Text style={{ color: '#555', fontSize: 11 }}>
                          Gửi lúc: {new Date(item.time).toLocaleString('vi-VN')}
                        </Text>
                        {item.sentCount ? (
                          <Text style={{ color: COLORS.success, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            Đã gửi: {item.sentCount} thiết bị
                          </Text>
                        ) : null}
                      </View>
                      {isPending ? (
                        <TouchableOpacity 
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 8 }}
                          onPress={() => handleDeleteScheduledPush(item.row, item.title)}
                        >
                          <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: 'bold' }}>Hủy lịch</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {hasUnsavedChanges && (
        <TouchableOpacity 
          style={styles.floatingSaveBtn} 
          onPress={saveAllConfigsToServer}
        >
          <RefreshCw color="#FFF" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.floatingSaveText}>LƯU THAY ĐỔI MÁY CHỦ</Text>
        </TouchableOpacity>
      )}

      {/* MODAL: SỬA KHÁCH HÀNG NÂNG CAO */}
      <Modal
        visible={isUserModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>CHỈNH SỬA NÂNG CAO</Text>
                <TouchableOpacity onPress={() => setIsUserModalVisible(false)}>
                  <X color="#FFF" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 8 }}>
                Email: <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{editUserEmail}</Text>
              </Text>

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Số dư Xu (Coins):</Text>
              <TextInput 
                style={styles.addInput}
                keyboardType="numeric"
                value={editUserCoins}
                onChangeText={setEditUserCoins}
              />

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 2 }}>Hạn dùng VIP:</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <TouchableOpacity 
                  style={[styles.pickerTriggerBtn, { height: 42 }]} 
                  onPress={() => setShowEditDatePicker(true)}
                >
                  <Text style={styles.pickerTriggerText}>
                    📅 {editUserVipDate ? editUserVipDate.toLocaleDateString('vi-VN') : 'Chọn hạn VIP...'}
                  </Text>
                </TouchableOpacity>
                
                {editUserVipDate && (
                  <TouchableOpacity 
                    style={{ backgroundColor: 'rgba(255,69,58,0.1)', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 0.8, borderColor: 'rgba(255,69,58,0.4)' }}
                    onPress={() => setEditUserVipDate(null)}
                  >
                    <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: 'bold' }}>XÓA VIP</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showEditDatePicker && (
                <DateTimePicker
                  value={editUserVipDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEditDatePicker(false);
                    if (date) setEditUserVipDate(date);
                  }}
                />
              )}

              <TouchableOpacity 
                style={[styles.submitBtn, { marginTop: 15, backgroundColor: COLORS.primary }]}
                onPress={saveUserChanges}
              >
                <Text style={styles.submitBtnText}>LƯU THAY ĐỔI</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL: DUYỆT ĐƠN THỦ CÔNG */}
      <Modal
        visible={isManualModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>DUYỆT ĐƠN THỦ CÔNG</Text>
                <TouchableOpacity onPress={() => setIsManualModalVisible(false)}>
                  <X color="#FFF" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#8E8E93', fontSize: 11, marginBottom: 8 }}>
                Nhập thông tin tài khoản / khóa kích hoạt để gửi cho khách hàng:
              </Text>

              <TextInput 
                style={[styles.textArea, { height: 100, marginBottom: 15 }]}
                placeholder="Nhập thông tin tài khoản (ví dụ: Tài khoản | Mật khẩu)..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={manualAccountText}
                onChangeText={setManualAccountText}
              />

              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: '#32D74B' }]}
                onPress={() => {
                  if (manualFulfillRow !== null) {
                    fulfillOrderManual(manualFulfillRow, manualAccountText);
                  }
                }}
              >
                <Text style={styles.submitBtnText}>HOÀN TẤT & GỬI KHÁCH</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MENU MODAL (HAMBURGER SIDEBAR / OVERLAY) */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.menuOverlayContainer}>
          <TouchableOpacity 
            style={styles.menuOverlayBg} 
            activeOpacity={1} 
            onPress={() => setIsMenuVisible(false)}
          />
          <View style={styles.menuDrawer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>DANH MỤC QUẢN TRỊ</Text>
              <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                <X color="#FFF" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
              {TABS.map(tab => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity 
                    key={tab.id} 
                    onPress={() => {
                      setActiveTab(tab.id);
                      setProductRenderLimit(30);
                      setRenderLimit(30);
                      setIsMenuVisible(false);
                    }} 
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                  >
                    <IconComponent color={isActive ? '#FF453A' : '#8E8E93'} size={20} style={{ marginRight: 12 }} />
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)', 
    borderRadius: 8, 
    borderWidth: 0.8, 
    borderColor: theme.border, 
    paddingHorizontal: 8, 
    height: 38 
  },
  searchInputCompact: { 
    flex: 1, 
    color: theme.text, 
    fontSize: 12, 
    height: '100%', 
    padding: 0 
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 50 : 25, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 0.8, borderColor: theme.border },
  headerTitle: { color: theme.danger, fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
  backBtn: { padding: 4, marginLeft: -4 },
  tabBar: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabBtn: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.8, borderColor: theme.border },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  tabText: { color: theme.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  content: { padding: 12, paddingBottom: 60 },

  loginContainer: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', padding: 15 },
  closeBtn: { position: 'absolute', top: 50, right: 15, zIndex: 10 },
  loginBox: { backgroundColor: theme.surfaceSolid, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 0.8, borderColor: theme.border },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 69, 58, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  loginTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  inputGroup: { width: '100%', height: 46, backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.05)' : '#000', borderRadius: 12, marginBottom: 15, paddingHorizontal: 12, borderWidth: 0.8, borderColor: theme.border, justifyContent: 'center' },
  input: { color: theme.text, fontSize: 15, textAlign: 'center', fontWeight: 'bold' },
  submitBtn: { backgroundColor: theme.danger, width: '100%', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  title: { color: theme.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 0.8, marginTop: 10 },
  userCard: { backgroundColor: theme.surfaceCard, padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 0.8, borderColor: theme.border },
  userName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  userEmail: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  vipTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(48, 209, 88, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 0.8, borderColor: 'rgba(48, 209, 88, 0.5)' },
  vipTagText: { color: theme.success, fontSize: 10, fontWeight: 'bold' },
  
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, borderColor: theme.border },
  actionText: { color: theme.text, fontSize: 10, fontWeight: 'bold' },
  cancelVipBtn: { flexDirection: 'row', marginTop: 6, backgroundColor: theme.danger, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.8, borderBottomColor: theme.border },
  settingText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  textArea: { 
    backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)', 
    color: theme.text, 
    padding: 12, 
    borderRadius: 10, 
    height: 90, 
    textAlignVertical: 'top', 
    borderWidth: 0.8, 
    borderColor: theme.border, 
    fontSize: 13 
  },
  addInput: { 
    backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)', 
    borderRadius: 10, 
    height: 42, 
    color: theme.text, 
    paddingHorizontal: 12, 
    marginBottom: 8, 
    borderWidth: 0.8, 
    borderColor: theme.border,
    fontSize: 13
  },

  // Dashboard & Inventory
  statCard: { width: '48%', backgroundColor: theme.surfaceCard, padding: 10, borderRadius: 12, borderWidth: 0.8, borderColor: theme.border },
  statIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { color: theme.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 2 },
  statValue: { color: theme.text, fontSize: 16, fontWeight: '900' },
  invCard: { backgroundColor: theme.surfaceCard, padding: 12, borderRadius: 12, borderWidth: 0.8, borderColor: theme.border, marginBottom: 8 },

  typeBtn: { flex: 1, flexDirection: 'row', height: 38, borderRadius: 8, borderWidth: 0.8, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: '#FFF' },
  typeBtnText: { color: theme.textMuted, fontSize: 11, fontWeight: 'bold' },

  gcCard: { flexDirection: 'row', backgroundColor: theme.surfaceCard, padding: 12, borderRadius: 12, borderWidth: 0.8, borderColor: theme.border, marginBottom: 8, alignItems: 'center' },

  // Custom Time Selector styles
  customTimeContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 15,
    borderRadius: 14,
    borderWidth: 0.8,
    marginTop: 10,
    marginBottom: 10,
    gap: 12
  },
  timeSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  timeSelectLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  timeSelectorGroup: {
    flexDirection: 'row',
    gap: 8
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  timeChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  timeChipText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 'bold'
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: theme.border
  },
  counterBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  counterValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center'
  },
  timeSummaryBox: {
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderColor: theme.border,
    alignItems: 'center'
  },
  timeSummaryText: {
    color: theme.textMuted,
    fontSize: 12
  },
  pickerTriggerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTriggerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  floatingSaveBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    backgroundColor: '#32D74B',
    borderRadius: 12,
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#32D74B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingSaveText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: theme.surfaceSolid || '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.8,
    borderColor: theme.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 0.8,
    borderColor: theme.border,
  },
  modalTitle: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  menuBtn: {
    padding: 4,
  },
  subheader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  subheaderText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  menuOverlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  menuOverlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  menuDrawer: {
    width: '75%',
    maxWidth: 300,
    height: '100%',
    backgroundColor: '#1C1C1E',
    borderRightWidth: 0.8,
    borderColor: '#2C2C2E',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 15,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.8,
    borderColor: '#2C2C2E',
  },
  menuTitle: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  menuList: {
    gap: 8,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF453A',
  },
  menuItemText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
  },
  menuItemTextActive: {
    color: '#FFF',
  }
});