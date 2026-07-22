window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwDkCyxMJJ0xD_l-9xMSiW_11DT0aL-A36FkcUY_jaSWFzypp6sbpTJ8bpwHkp-mp-tCg/exec",
  WORSHIP_HOME_URL: "https://worship.watv.org/vi/home",
  SONG_BASE_URL: "https://bookvn.net/newsong/newsong",
  SESSION_TOKEN_KEY: "sionLangDhToken",
  SESSION_USER_KEY: "sionLangDhUser",
  SESSION_EXPIRES_KEY: "sionLangDhExpiresAt",
  DEFAULT_SITE_NAME: "Sion Lang DH",
  DEFAULT_HOME_HERO_IMAGE: "./assets/images/home-hero.jpg",
  DEFAULT_LOGIN_BACKGROUND: "./assets/images/login-background.jpg",
  SERVICE_ORDER: {
    morning: 0,
    afternoon: 1,
    evening: 2
  },
  PROGRAM_FALLBACK: [
    {
      id: "morning",
      label: "Buổi sáng",
      songs: [],
      sermonSite: "",
      sermonYoutube: "",
      sermonText: "",
      rawContent: "Không tải được dữ liệu chương trình từ API. Đây là dữ liệu dự phòng cục bộ."
    },
    {
      id: "afternoon",
      label: "Buổi chiều",
      songs: [],
      sermonSite: "",
      sermonYoutube: "",
      sermonText: "",
      rawContent: "Không tải được dữ liệu chương trình từ API. Đây là dữ liệu dự phòng cục bộ."
    },
    {
      id: "evening",
      label: "Buổi tối",
      songs: [],
      sermonSite: "",
      sermonYoutube: "",
      sermonText: "",
      rawContent: "Không tải được dữ liệu chương trình từ API. Đây là dữ liệu dự phòng cục bộ."
    }
  ]
};
