window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyNMSQIclzrDFgU9n1Y0Mp8Fp7UGj9-GaOg8WCZ13LRHizB3Ne-Cda1TS4DfO8FtJAESQ/exec",
  WORSHIP_HOME_URL: "https://worship.watv.org/vi/home",
  SONG_BASE_URL: "https://bookvn.net/newsong/newsong",
  SERVICE_ORDER: {
    morning: 0,
    afternoon: 1,
    evening: 2
  },
  DEFAULT_SERVICES: [
    {
      id: "morning",
      label: "Buổi sáng",
      startTime: "09:00",
      tag: "Khai mạc 9h",
      openingText: "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI SÁNG SABAT Ngày 18 tháng 07 năm 2026",
      songs: ["136", "82", "97", "42", "3", "144"],
      summary: "Bài ca mở đầu 136 - 82 - 97, tán dương 42, 3 và dâng hiến 144.",
      sermonSite: "https://worshipvn.net/vi/sermon/251945",
      sermonYoutube: "https://youtu.be/D4R8n8FkKF0?si=KehKCBIXl0qzC_oN",
      sermonText: "https://watv.org/vi/bible_word/god-seeking-people/",
      rawContent: `1/ Hát BCM: 136 - 82 - 97 chuẩn bị trước giờ khai mạc
2/ Đúng 9h Tuyên bố khai mạc: TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI SÁNG SABAT Ngày 18 tháng 07 năm 2026
3/ CN ngẫm nghĩ
4/ Tán dương BCM (đứng): 42
5/ CN đại diện (thành tiếng, và ngồi xuống sau cầu nguyện)
6/ Tán dương BCM: 3
7/ CN đại diện
8/ CPN cho nhau (nếu có 2-3 người)
9/ Giảng đạo: (Video) Vua Asa và vua Giôsaphát
10/ Dâng hiến - tán dương (144)
11/ CN bế mạc
12/ CN chúng con mong muốn và CN ngẫm nghĩ
13/ Tuyên bố kết thúc lễ thờ phượng tại đây`
    },
    {
      id: "afternoon",
      label: "Buổi chiều",
      startTime: "15:00",
      tag: "Khai mạc 15h",
      openingText: "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI CHIỀU SABAT Ngày 18 tháng 07 năm 2026",
      songs: ["232", "238", "301", "43", "106"],
      summary: "Bài ca mở đầu 232 - 238 - 301, tán dương 43 và dâng hiến 106.",
      sermonSite: "https://worshipvn.net/vi/sermon/102380",
      sermonYoutube: "https://youtu.be/-p19YHpLG8M?si=O0AKIEZJcHNjXGtC",
      sermonText: "https://watv.org/vi/bible_word/passover-heavenly-citizenship/",
      rawContent: `1/ Hát BCM: 232 - 238 - 301 chuẩn bị trước giờ khai mạc
2/ Đúng 15h Tuyên bố khai mạc: TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI CHIỀU SABAT Ngày 18 tháng 07 năm 2026
3/ CN ngẫm nghĩ
4/ Tán dương BCM (đứng): 43
5/ CN đại diện (thành tiếng, và ngồi xuống sau cầu nguyện)
6/ CPN cho nhau (nếu có 2-3 người)
7/ Giảng đạo: (Video) Ai là người dân chân thật của Đức Chúa Trời?
8/ Dâng hiến - tán dương (106)
9/ CN bế mạc
10/ CN chúng con mong muốn và CN ngẫm nghĩ
11/ Tuyên bố kết thúc lễ thờ phượng tại đây`
    },
    {
      id: "evening",
      label: "Buổi tối",
      startTime: "20:00",
      tag: "Khai mạc 20h",
      openingText: "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI TỐI SABAT Ngày 18 tháng 07 năm 2026",
      songs: ["142", "189", "295", "44", "361"],
      summary: "Bài ca mở đầu 142 - 189 - 295, tán dương 44 và dâng hiến 361.",
      sermonSite: "https://worshipvn.net/vi/sermon/100043",
      sermonYoutube: "https://youtu.be/eXplORY9uT8?si=fDufautl_tN3Qf34",
      sermonText: "https://watv.org/vi/bible_word/first-second-coming/",
      rawContent: `1/ Hát BCM: 142 - 189 - 295 chuẩn bị trước giờ khai mạc
2/ Đúng 20h Tuyên bố khai mạc: TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI TỐI SABAT Ngày 18 tháng 07 năm 2026
3/ CN ngẫm nghĩ
4/ Tán dương BCM (đứng): 44
5/ CN đại diện (thành tiếng, và ngồi xuống sau cầu nguyện)
6/ CPN cho nhau (nếu có 2-3 người)
7/ Giảng đạo: (Video) Đức Chúa Trời An Xang Hồng, Đấng dựng nên Siôn
8/ Dâng hiến - tán dương (361)
9/ CN bế mạc
10/ CN chúng con mong muốn và CN ngẫm nghĩ
11/ Tuyên bố kết thúc lễ thờ phượng tại đây`
    }
  ]
};
