const appType = process.env.EXPO_PUBLIC_APP_TYPE;
const appName = appType === 'admin' ? "VSign Admin" : appType === 'movie' ? "RoPhim" : "VSign";
const bundleId = appType === 'admin' ? "com.ipaviet.esign.admin" : appType === 'movie' ? "com.ipaviet.esign.movie" : "com.ipaviet.esign";

module.exports = {
  expo: {
    name: appName,
    slug: "VSign",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#121212"
    },
    plugins: [
      "expo-router",
      "@react-native-community/datetimepicker"
    ],
    ios: {
      icon: "./assets/images/icon.png",
      supportsTablet: true,
      bundleIdentifier: bundleId,
      infoPlist: {
        LSApplicationQueriesSchemes: [
          "itms-services"
        ],
        UIFileSharingEnabled: true,
        LSSupportsOpeningDocumentsInPlace: true,
        ITSAppUsesNonExemptEncryption: false,
        NSDocumentsFolderUsageDescription: "Cho phép ứng dụng lưu và quản lý file IPA trong thư mục Tài liệu của bạn.",
        NSPhotoLibraryAddUsageDescription: "Cho phép ứng dụng lưu trữ file vào thiết bị."
      }
    },
    extra: {
      router: {},
      eas: {
        projectId: "6554e796-6e4a-4760-9fcb-407f58e7e69c"
      }
    }
  }
};
