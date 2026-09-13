/**
 * DROP-IN REPLACEMENT: TRINH TAO NHANH / GOOGLE FORM
 *
 * Cach dung:
 * 1. Trong Apps Script day du, xoa phan cu tu getProgramData_()
 *    den cleanUrl_().
 * 2. Dan toan bo file nay vao dung vi tri do.
 * 3. Giu nguyen cac phan login, settings, wheels va helper con lai.
 *
 * Diem khac voi logic cu:
 * - Khong dung title "Buoi sang/Chieu/Toi" de phan loai.
 * - Doc title + helpText chi de lay TOAN BO NOI DUNG cua item.
 * - Nhan dien buoi tu cau:
 *   "TU BAY GIO XIN TUYEN BO BAT DAU LE THO PHUONG BUOI ..."
 * - Lay gio tu cau "Dung 5h/19h30 Tuyen bo khai mac".
 * - Lay ngay tu noi dung, vi du "Ngay 14 thang 09 nam 2026".
 * - Chi nhan chuong trinh co ngay hom nay hoac trong tuong lai.
 * - Neu co nhieu chuong trinh cung mot buoi, chon ngay gan nhat.
 *
 * File nay can cac helper da co trong Apps Script day du:
 * - getSetting_(key, fallbackValue)
 * - parseBoolean_(value)
 */

/* =========================================================
 * PROGRAM / GOOGLE FORM
 * ========================================================= */

function getProgramData_() {
  const maintenanceMode = parseBoolean_(
    getSetting_("maintenanceMode", false)
  );

  if (maintenanceMode) {
    return {
      success: false,
      maintenance: true,
      error: "Hệ thống đang được bảo trì."
    };
  }

  const today = getProgramTodayParts_(new Date());
  const candidates = readFormProgramCandidates_(today);
  const tuesday = selectNearestProgram_(candidates, "tuesday");
  let services;

  // Giu nguyen uu tien cu: neu co chuong trinh Thu Ba Tinh Sach
  // chua qua ngay thi chi tra ve chuong trinh nay.
  if (tuesday) {
    services = [
      buildServiceFromCandidate_(
        "evening",
        "Buổi tối Thứ Ba Tinh Sạch",
        tuesday
      )
    ];
  } else {
    services = [
      buildServiceFromCandidate_(
        "morning",
        "Buổi sáng",
        selectNearestProgram_(candidates, "morning")
      ),
      buildServiceFromCandidate_(
        "afternoon",
        "Buổi chiều",
        selectNearestProgram_(candidates, "afternoon")
      ),
      buildServiceFromCandidate_(
        "evening",
        "Buổi tối",
        selectNearestProgram_(candidates, "evening")
      )
    ];
  }

  return {
    success: true,
    updatedAt: new Date().toISOString(),
    services: services
  };
}

function getGoogleFormUrl_() {
  const formUrl = String(getSetting_("googleFormUrl", "")).trim();

  if (!formUrl) {
    throw new Error(
      "Chưa cấu hình googleFormUrl trong sheet Settings."
    );
  }

  if (!/^https:\/\/docs\.google\.com\/forms\//i.test(formUrl)) {
    throw new Error("googleFormUrl không phải URL Google Form hợp lệ.");
  }

  return formUrl;
}

/**
 * Doc cac item theo thu tu cua Form.
 *
 * Title khong duoc dung de quyet dinh ten buoi. Title va helpText chi
 * duoc noi lai thanh rawContent; detectWorshipSection_ chi tim cau
 * tuyen bo khai mac nam trong noi dung do.
 */
function readFormProgramCandidates_(today) {
  const form = FormApp.openByUrl(getGoogleFormUrl_());
  const items = form.getItems();
  const candidates = [];
  let currentBlock = null;

  items.forEach(function (item) {
    const itemContent = getItemContent_(item);
    const combinedContent = [
      itemContent.title,
      itemContent.helpText
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!combinedContent) {
      return;
    }

    const detectedSection = detectWorshipSection_(
      normalizeText_(combinedContent)
    );

    if (detectedSection) {
      addProgramCandidate_(candidates, currentBlock, today);
      currentBlock = {
        sectionId: detectedSection,
        parts: [combinedContent]
      };
      return;
    }

    // Sau khi gap cau tuyen bo, cac item tiep theo van thuoc cung buoi
    // cho den khi gap cau tuyen bo cua buoi moi.
    if (currentBlock) {
      currentBlock.parts.push(combinedContent);
    }
  });

  addProgramCandidate_(candidates, currentBlock, today);
  return candidates;
}

function addProgramCandidate_(candidates, block, today) {
  if (!block || !Array.isArray(block.parts)) {
    return;
  }

  const rawContent = block.parts.filter(Boolean).join("\n").trim();
  const candidate = parseProgramBlock_(
    block.sectionId,
    rawContent,
    today
  );

  if (candidate) {
    candidates.push(candidate);
  }
}

/**
 * Tra null neu block khong co ngay hop le hoac ngay da qua.
 */
function parseProgramBlock_(sectionId, rawContent, today) {
  const programDate = extractProgramDate_(rawContent);

  if (!programDate) {
    return null;
  }

  const todayParts = today || getProgramTodayParts_(new Date());
  const todayKey = toProgramDateKey_(todayParts);
  const programDateKey = toProgramDateKey_(programDate);

  if (programDateKey < todayKey) {
    return null;
  }

  return {
    sectionId: sectionId,
    rawContent: String(rawContent || "").trim(),
    startTime: extractOpeningTime_(rawContent),
    programDate: programDate,
    programDateKey: programDateKey
  };
}

/**
 * Neu mot buoi co nhieu ngay chua qua, chon ngay gan nhat.
 */
function selectNearestProgram_(candidates, sectionId) {
  const matchingCandidates = candidates
    .filter(function (candidate) {
      return candidate.sectionId === sectionId;
    })
    .sort(function (left, right) {
      return left.programDateKey - right.programDateKey;
    });

  return matchingCandidates.length ? matchingCandidates[0] : null;
}

function buildServiceFromCandidate_(id, baseLabel, candidate) {
  if (!candidate) {
    return buildService_(id, baseLabel, "", "", null);
  }

  return buildService_(
    id,
    baseLabel,
    candidate.rawContent,
    candidate.startTime,
    candidate.programDate
  );
}

/**
 * Chi nhan dien bang cau tuyen bo, khong dua vao header/title ngan.
 * Ho tro BUOI MAI nhu BUOI SANG.
 */
function detectWorshipSection_(normalizedContent) {
  const text = String(normalizedContent || "");
  const declaration =
    "TU BAY GIO XIN TUYEN BO BAT DAU LE THO PHUONG";

  if (!text.includes(declaration)) {
    return null;
  }

  const declarationIndex = text.indexOf(declaration);
  const declarationText = text.slice(
    declarationIndex,
    declarationIndex + 220
  );

  if (
    /BUOI TOI THU (?:3|BA) TINH SACH/.test(declarationText)
  ) {
    return "tuesday";
  }

  if (/BUOI (?:MAI|SANG)\b/.test(declarationText)) {
    return "morning";
  }

  if (/BUOI CHIEU\b/.test(declarationText)) {
    return "afternoon";
  }

  if (/BUOI TOI\b/.test(declarationText)) {
    return "evening";
  }

  return null;
}

/**
 * Ho tro cac dang:
 * - Ngay 14 thang 09 nam 2026
 * - Ngay 14/09/2026
 * - 14-09-2026
 */
function extractProgramDate_(content) {
  const text = normalizeText_(content);
  const patterns = [
    /\bNGAY\s+(\d{1,2})\s+THANG\s+(\d{1,2})\s+NAM\s+(\d{4})\b/,
    /\b(?:NGAY\s+)?(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})\b/
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const match = text.match(patterns[index]);

    if (!match) {
      continue;
    }

    const result = {
      day: Number(match[1]),
      month: Number(match[2]),
      year: Number(match[3])
    };

    if (isValidProgramDate_(result)) {
      return result;
    }
  }

  return null;
}

/**
 * Lay gio o dung dong "Dung ... Tuyen bo khai mac".
 */
function extractOpeningTime_(content) {
  const text = normalizeText_(content);
  const match = text.match(
    /\bDUNG\s+(\d{1,2})\s*(?:H|GIO)\s*(\d{1,2})?\s+TUYEN\s+BO\s+KHAI\s+MAC\b/
  );

  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const minute = typeof match[2] === "undefined"
    ? 0
    : Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  return minute === 0
    ? hour + "h"
    : hour + "h" + String(minute).padStart(2, "0");
}

function getProgramTodayParts_(date) {
  // Website phuc vu tai Viet Nam, khong phu thuoc timezone mac dinh
  // cua tai khoan tao Apps Script.
  const timeZone = "Asia/Bangkok";
  const value = Utilities.formatDate(
    date || new Date(),
    timeZone,
    "yyyy-MM-dd"
  ).split("-");

  return {
    year: Number(value[0]),
    month: Number(value[1]),
    day: Number(value[2])
  };
}

function toProgramDateKey_(dateParts) {
  return (
    Number(dateParts.year) * 10000 +
    Number(dateParts.month) * 100 +
    Number(dateParts.day)
  );
}

function isValidProgramDate_(dateParts) {
  const year = Number(dateParts.year);
  const month = Number(dateParts.month);
  const day = Number(dateParts.day);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear_(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  return day <= daysInMonth[month - 1];
}

function isLeapYear_(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function formatProgramDate_(dateParts) {
  if (!dateParts) {
    return "";
  }

  return [
    String(dateParts.year).padStart(4, "0"),
    String(dateParts.month).padStart(2, "0"),
    String(dateParts.day).padStart(2, "0")
  ].join("-");
}

function appendTimeToLabel_(label, startTime) {
  const baseLabel = String(label || "").trim();
  const time = String(startTime || "").trim();

  return time ? baseLabel + " " + time : baseLabel;
}

function getItemContent_(item) {
  const type = item.getType();
  let title = "";
  let helpText = "";

  if (type === FormApp.ItemType.PAGE_BREAK) {
    const page = item.asPageBreakItem();
    title = page.getTitle() || "";
    helpText = page.getHelpText() || "";
  } else if (type === FormApp.ItemType.SECTION_HEADER) {
    const section = item.asSectionHeaderItem();
    title = section.getTitle() || "";
    helpText = section.getHelpText() || "";
  } else {
    try {
      title = item.getTitle() || "";
    } catch (error) {
      title = "";
    }

    try {
      helpText = item.getHelpText() || "";
    } catch (error) {
      helpText = "";
    }
  }

  return {
    title: title,
    helpText: helpText
  };
}

function normalizeText_(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildService_(id, label, rawContent, startTime, programDate) {
  const normalizedContent = String(rawContent || "").trim();
  const normalizedTime = String(startTime || "").trim();

  return {
    id: id,
    label: appendTimeToLabel_(label, normalizedTime),
    songs: extractSongs_(normalizedContent),

    sermonSite: extractFirstUrl_(
      normalizedContent,
      /https?:\/\/(?:www\.)?worshipvn\.net\/[^\s<>"')]+/i
    ),

    sermonYoutube: extractFirstUrl_(
      normalizedContent,
      /https?:\/\/(?:(?:www\.)?youtube\.com|youtu\.be)\/[^\s<>"')]+/i
    ),

    sermonText: extractFirstUrl_(
      normalizedContent,
      /https?:\/\/(?:www\.)?watv\.org\/vi\/bible_word\/[^\s<>"')]+/i
    ),

    rawContent: normalizedContent,
    startTime: normalizedTime,
    programDate: formatProgramDate_(programDate)
  };
}

function extractSongs_(content) {
  const text = String(content || "");
  const songs = [];
  const patterns = [
    /Hát\s+BCM\s*:\s*([\d\s\-–—,]+)/gi,
    /Tán\s+dương\s+BCM(?:\s*\([^)]*\))?\s*:\s*(\d+)/gi,
    /Dâng\s+hiến\s*[-–—]\s*tán\s+dương\s*\(?\s*(\d+)\s*\)?/gi
  ];

  patterns.forEach(function (pattern) {
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const numbers = String(match[1]).match(/\d+/g) || [];

      numbers.forEach(function (number) {
        const value = Number(number);

        if (value > 0 && value < 1000) {
          songs.push(String(value));
        }
      });
    }
  });

  return songs.filter(function (song, index, array) {
    return array.indexOf(song) === index;
  });
}

function extractFirstUrl_(content, pattern) {
  const match = String(content || "").match(pattern);
  return match ? cleanUrl_(match[0]) : "";
}

function cleanUrl_(url) {
  return String(url || "").replace(/[.,;:!?]+$/, "");
}

/* =========================================================
 * SELF TEST - co the chay truc tiep trong Apps Script
 * ========================================================= */

function getQuickProgramSelfTestResults_() {
  const today = { year: 2026, month: 9, day: 13 };
  const morningContent = [
    "BUỔI MAI TLCN ĐẠI LỄ CHUỘC TỘI",
    "1/ Hát BCM: 100 - 237 chuẩn bị trước giờ khai mạc",
    "2/ Đúng 5h Tuyên bố khai mạc:",
    "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI MAI TUẦN LỄ CẦU NGUYỆN",
    "Ngày 14 tháng 09 năm 2026"
  ].join("\n");
  const eveningContent = [
    "Tiêu đề này cố ý viết sai",
    "1/ Hát BCM: 270 - 288 - 304 chuẩn bị trước giờ khai mạc",
    "2/ Đúng 19h30 Tuyên bố khai mạc:",
    "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI TỐI TUẦN LỄ CẦU NGUYỆN",
    "Ngày 13 tháng 09 năm 2026"
  ].join("\n");
  const expiredContent = eveningContent.replace(
    "Ngày 13 tháng 09 năm 2026",
    "Ngày 12 tháng 09 năm 2026"
  );

  const morningSection = detectWorshipSection_(normalizeText_(morningContent));
  const eveningSection = detectWorshipSection_(normalizeText_(eveningContent));
  const morning = parseProgramBlock_(morningSection, morningContent, today);
  const evening = parseProgramBlock_(eveningSection, eveningContent, today);
  const expired = parseProgramBlock_(eveningSection, expiredContent, today);
  const tests = [
    {
      name: "Buoi mai duoc nhan la morning",
      passed: morningSection === "morning"
    },
    {
      name: "Ngay mai duoc giu lai",
      passed: Boolean(morning) && morning.programDateKey === 20260914
    },
    {
      name: "Lay dung gio 5h",
      passed: Boolean(morning) && morning.startTime === "5h"
    },
    {
      name: "Tieu de sai khong anh huong buoi toi",
      passed: eveningSection === "evening"
    },
    {
      name: "Hom nay duoc giu lai",
      passed: Boolean(evening) && evening.programDateKey === 20260913
    },
    {
      name: "Lay dung gio 19h30",
      passed: Boolean(evening) && evening.startTime === "19h30"
    },
    {
      name: "Ngay hom qua bi loai",
      passed: expired === null
    },
    {
      name: "Giu logic lay danh sach bai ca",
      passed: extractSongs_(eveningContent).join(",") === "270,288,304"
    }
  ];

  return {
    success: tests.every(function (test) {
      return test.passed;
    }),
    tests: tests
  };
}

function testQuickProgramParser_() {
  const result = getQuickProgramSelfTestResults_();
  Logger.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    throw new Error("Quick Program self-test thất bại.");
  }

  return result;
}
