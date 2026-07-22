window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwDkCyxMJJ0xD_l-9xMSiW_11DT0aL-A36FkcUY_jaSWFzypp6sbpTJ8bpwHkp-mp-tCg/exec",
  WORSHIP_HOME_URL: "https://worship.watv.org/vi/home",
  SONG_BASE_URL: "https://bookvn.net/newsong/newsong",
  SESSION_TOKEN_KEY: "sionLangDhToken",
  SESSION_USER_KEY: "sionLangDhUser",
  SESSION_EXPIRES_KEY: "sionLangDhExpiresAt",
  PROGRAM_CACHE_KEY: "sionLangDhProgramCache",
  PROGRAM_CACHE_TTL_MS: 60 * 60 * 1000,
  DEFAULT_SITE_NAME: "Sion Lang DH",
  DEFAULT_HOME_HERO_IMAGE: "./assets/images/home-hero.jpg",
  DEFAULT_LOGIN_BACKGROUND: "./assets/images/login-background.jpg",
  TEACHING_DRAW_BACKGROUND: "./assets/images/teaching-draw-background.jpg",
  QUICK_PROGRAM_BACKGROUND: "./assets/images/quick-program-background.jpg",
  LOCAL_AUTH_USERS: [
    {
      id: "admin",
      password: "2",
      displayName: "Admin",
      role: "admin"
    },
    {
      id: "ctcm2026",
      password: "chuckettrai",
      displayName: "CTCM 2026",
      role: "user"
    }
  ],
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
      rawContent: "Chưa có nội dung chương trình mới cho buổi này."
    },
    {
      id: "afternoon",
      label: "Buổi chiều",
      songs: [],
      sermonSite: "",
      sermonYoutube: "",
      sermonText: "",
      rawContent: "Chưa có nội dung chương trình mới cho buổi này."
    },
    {
      id: "evening",
      label: "Buổi tối",
      songs: [],
      sermonSite: "",
      sermonYoutube: "",
      sermonText: "",
      rawContent: "Chưa có nội dung chương trình mới cho buổi này."
    }
  ]
};
