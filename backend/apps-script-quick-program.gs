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
 * - Uu tien title "Buoi sang/Chieu/Toi" de phan loai.
 * - Neu title khong ro rang, moi nhan dien buoi tu cau:
 *   "TU BAY GIO XIN TUYEN BO BAT DAU LE THO PHUONG BUOI ..."
 * - Lay gio tu cau "Dung 5h/19h30 Tuyen bo khai mac".
 * - Neu gio mau thuan voi buoi, khong dua gio sai len nhan va tra canh bao.
 * - Khong doc va khong loc theo ngay thang trong noi dung.
 * - Ngay bi sai, da qua hoac khong duoc nhap deu khong anh huong.
 * - Neu co nhieu chuong trinh cung mot buoi, chon block dau tien tren Form.
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

  const selected = selectProgramSet_(readFormProgramCandidates_());
  const services = [
    buildServiceFromCandidate_(
      "morning",
      "Buổi sáng",
      selected.morning
    ),
    buildServiceFromCandidate_(
      "afternoon",
      "Buổi chiều",
      selected.afternoon
    ),
    buildServiceFromCandidate_(
      "evening",
      "Buổi tối",
      selected.evening
    )
  ];

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
 * Title BUOI ... la nguon uu tien. Cau tuyen bo khai mac chi la fallback.
 * Neu title va cau tuyen bo mau thuan, giu phan loai theo title va tra
 * canh bao de nguoi dung sua lai Google Form.
 */
function readFormProgramCandidates_() {
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

    const headingSection = detectWorshipHeadingSection_(itemContent.title);
    const declarationSection = detectWorshipSection_(
      normalizeText_(combinedContent)
    );

    if (headingSection) {
      addProgramCandidate_(candidates, currentBlock);
      currentBlock = {
        sectionId: headingSection,
        preferredLabel: extractHeadingLabel_(itemContent.title, headingSection),
        parts: [combinedContent],
        warnings: [],
        hasDeclaration: Boolean(declarationSection)
      };

      addSectionConflictWarning_(
        currentBlock,
        headingSection,
        declarationSection
      );
      return;
    }

    if (declarationSection && currentBlock && !currentBlock.hasDeclaration) {
      currentBlock.parts.push(combinedContent);
      currentBlock.hasDeclaration = true;
      addSectionConflictWarning_(
        currentBlock,
        currentBlock.sectionId,
        declarationSection
      );
      return;
    }

    if (declarationSection) {
      addProgramCandidate_(candidates, currentBlock);
      currentBlock = {
        sectionId: declarationSection,
        preferredLabel: "",
        parts: [combinedContent],
        warnings: [],
        hasDeclaration: true
      };
      return;
    }

    // Sau khi gap cau tuyen bo, cac item tiep theo van thuoc cung buoi
    // cho den khi gap cau tuyen bo cua buoi moi.
    if (currentBlock) {
      currentBlock.parts.push(combinedContent);
    }
  });

  addProgramCandidate_(candidates, currentBlock);
  return candidates;
}

function addProgramCandidate_(candidates, block) {
  if (!block || !Array.isArray(block.parts)) {
    return;
  }

  const rawContent = block.parts.filter(Boolean).join("\n").trim();
  const candidate = parseProgramBlock_(
    block.sectionId,
    rawContent,
    block.warnings,
    block.preferredLabel
  );

  if (candidate) {
    candidates.push(candidate);
  }
}

/**
 * Ngay thang (neu co) chi la noi dung hien thi, khong duoc dung de loc.
 */
function parseProgramBlock_(sectionId, rawContent, warnings, preferredLabel) {
  const normalizedContent = String(rawContent || "").trim();
  const detectedTime = extractOpeningTime_(normalizedContent);
  const candidateWarnings = Array.isArray(warnings)
    ? warnings.slice()
    : [];
  const startTime = isOpeningTimeCompatible_(sectionId, detectedTime)
    ? detectedTime
    : "";

  if (detectedTime && !startTime) {
    candidateWarnings.push(
      "Giờ khai mạc " + detectedTime +
      " không phù hợp với " + getSectionDisplayName_(sectionId) +
      ". Hệ thống đã bỏ giờ khỏi nhãn; hãy kiểm tra lại Google Form."
    );
  }

  if (
    !sectionId ||
    !normalizedContent ||
    !hasMeaningfulProgramContent_(normalizedContent, startTime)
  ) {
    return null;
  }

  return {
    sectionId: sectionId,
    rawContent: normalizedContent,
    startTime: startTime,
    label: preferredLabel || extractProgramLabel_(normalizedContent, sectionId),
    warnings: candidateWarnings
  };
}

function getSectionFamily_(sectionId) {
  return sectionId === "tuesday" ? "evening" : sectionId;
}

function getSectionDisplayName_(sectionId) {
  if (sectionId === "morning") {
    return "Buổi sáng/Buổi mai";
  }

  if (sectionId === "afternoon") {
    return "Buổi chiều";
  }

  return "Buổi tối";
}

function addSectionConflictWarning_(block, headingSection, declarationSection) {
  if (
    !block ||
    !headingSection ||
    !declarationSection ||
    getSectionFamily_(headingSection) === getSectionFamily_(declarationSection)
  ) {
    return;
  }

  block.warnings.push(
    "Tiêu đề là " + getSectionDisplayName_(headingSection) +
    " nhưng câu tuyên bố ghi " + getSectionDisplayName_(declarationSection) +
    ". Hệ thống ưu tiên tiêu đề; hãy kiểm tra lại Google Form."
  );
}

function isOpeningTimeCompatible_(sectionId, startTime) {
  if (!startTime) {
    return true;
  }

  const hour = Number(String(startTime).split("h")[0]);

  if (!Number.isInteger(hour)) {
    return false;
  }

  if (sectionId === "morning") {
    return hour >= 0 && hour < 12;
  }

  if (sectionId === "afternoon") {
    return hour >= 12 && hour < 18;
  }

  return hour >= 18 && hour <= 23;
}

function hasMeaningfulProgramContent_(content, startTime) {
  const text = String(content || "");

  return Boolean(
    startTime ||
    extractSongs_(text).length ||
    /(?:^|\n)\s*\d+\s*\/\s*\S/m.test(text) ||
    /https?:\/\//i.test(text)
  );
}

/**
 * Neu mot buoi co nhieu block, chon block dau tien theo thu tu cua Form.
 */
function selectProgram_(candidates, sectionId) {
  const matchingCandidates = candidates
    .filter(function (candidate) {
      return candidate.sectionId === sectionId;
    });

  return matchingCandidates.length ? matchingCandidates[0] : null;
}

/**
 * Lay cac buoi sang/chieu nam truoc chuong trinh buoi toi dau tien.
 * Sau buoi toi dau tien, moi block buoi toi khac deu bi bo qua.
 */
function selectProgramSet_(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const eveningIndex = list.findIndex(function (candidate) {
    return (
      candidate.sectionId === "tuesday" ||
      candidate.sectionId === "evening"
    );
  });
  const beforeEvening = eveningIndex >= 0
    ? list.slice(0, eveningIndex)
    : list;

  return {
    morning: selectProgram_(beforeEvening, "morning"),
    afternoon: selectProgram_(beforeEvening, "afternoon"),
    evening: eveningIndex >= 0 ? list[eveningIndex] : null
  };
}

function buildServiceFromCandidate_(id, baseLabel, candidate) {
  if (!candidate) {
    return buildService_(id, baseLabel, "", "", null, []);
  }

  return buildService_(
    id,
    candidate.label || baseLabel,
    candidate.rawContent,
    candidate.startTime,
    null,
    candidate.warnings
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
 * Nhan dien title ngan cua Form. Title duoc uu tien hon cau tuyen bo vi
 * nguoi nhap thuong sao chep noi dung cu va quen sua cau tuyen bo ben duoi.
 */
function detectWorshipHeadingSection_(title) {
  const text = normalizeText_(title);

  if (/^BUOI TOI THU (?:3|BA) TINH SACH\b/.test(text)) {
    return "tuesday";
  }

  if (/^BUOI (?:MAI|SANG)\b/.test(text)) {
    return "morning";
  }

  if (/^BUOI CHIEU\b/.test(text)) {
    return "afternoon";
  }

  if (/^BUOI TOI\b/.test(text)) {
    return "evening";
  }

  return null;
}

function extractHeadingLabel_(title, sectionId) {
  const text = normalizeText_(title);

  if (sectionId === "morning") {
    return /^BUOI MAI\b/.test(text) ? "Buổi mai" : "Buổi sáng";
  }

  if (sectionId === "afternoon") {
    return "Buổi chiều";
  }

  if (sectionId === "tuesday") {
    return "Buổi tối Thứ Ba Tinh Sạch";
  }

  if (/^BUOI TOI[^\n]{0,140}TUAN LE CAU NGUYEN\b/.test(text)) {
    return "Buổi tối Tuần lễ Cầu nguyện";
  }

  if (/^BUOI TOI[^\n]{0,140}SABAT\b/.test(text)) {
    return "Buổi tối Sabat";
  }

  return "Buổi tối";
}

function isWorshipHeading_(title) {
  return /^BUOI\s+(?:MAI|SANG|CHIEU|TOI)\b/.test(
    normalizeText_(title)
  );
}

/**
 * Lay ten buoi tu cau tuyen bo trong noi dung, khong dung title cua Form.
 */
function extractProgramLabel_(content, sectionId) {
  const text = normalizeText_(content);
  const declaration =
    "TU BAY GIO XIN TUYEN BO BAT DAU LE THO PHUONG";
  const declarationIndex = text.indexOf(declaration);
  const declarationText = declarationIndex >= 0
    ? text.slice(declarationIndex, declarationIndex + 260)
    : text;

  if (sectionId === "morning") {
    return /BUOI MAI\b/.test(declarationText)
      ? "Buổi mai"
      : "Buổi sáng";
  }

  if (sectionId === "afternoon") {
    return "Buổi chiều";
  }

  if (
    sectionId === "tuesday" ||
    /BUOI TOI THU (?:3|BA) TINH SACH\b/.test(declarationText)
  ) {
    return "Buổi tối Thứ Ba Tinh Sạch";
  }

  if (/BUOI TOI[^\n]{0,140}TUAN LE CAU NGUYEN\b/.test(declarationText)) {
    return "Buổi tối Tuần lễ Cầu nguyện";
  }

  if (/BUOI TOI[^\n]{0,140}SABAT\b/.test(declarationText)) {
    return "Buổi tối Sabat";
  }

  return "Buổi tối";
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
    helpText: helpText,
    isSectionBoundary:
      type === FormApp.ItemType.PAGE_BREAK ||
      type === FormApp.ItemType.SECTION_HEADER
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

function buildService_(id, label, rawContent, startTime, programDate, warnings) {
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
    programDate: formatProgramDate_(programDate),
    warnings: Array.isArray(warnings) ? warnings : []
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
  const noDateContent = eveningContent.replace(
    "Ngày 13 tháng 09 năm 2026",
    ""
  );
  const afternoonContent = [
    "Header không cần đúng tên buổi",
    "2/ Đúng 14h Tuyên bố khai mạc:",
    "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI CHIỀU SABAT",
    "Ngày 13 tháng 09 năm 2026"
  ].join("\n");
  const copiedAfternoonContent = [
    "BUỔI CHIỀU ĐẠI LỄ CHUỘC TỘI",
    "1/ Hát BCM: 291 - 296 - 308 chuẩn bị trước giờ khai mạc",
    "2/ Đúng 10h Tuyên bố khai mạc:",
    "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI SÁNG ĐẠI LỄ CHUỘC TỘI"
  ].join("\n");

  const morningSection = detectWorshipSection_(normalizeText_(morningContent));
  const eveningSection = detectWorshipSection_(normalizeText_(eveningContent));
  const afternoonSection = detectWorshipSection_(normalizeText_(afternoonContent));
  const morning = parseProgramBlock_(morningSection, morningContent);
  const evening = parseProgramBlock_(eveningSection, eveningContent);
  const afternoon = parseProgramBlock_(afternoonSection, afternoonContent);
  const expired = parseProgramBlock_(eveningSection, expiredContent);
  const noDate = parseProgramBlock_(eveningSection, noDateContent);
  const copiedAfternoonHeadingSection = detectWorshipHeadingSection_(
    "BUỔI CHIỀU ĐẠI LỄ CHUỘC TỘI"
  );
  const copiedAfternoonDeclarationSection = detectWorshipSection_(
    normalizeText_(copiedAfternoonContent)
  );
  const copiedAfternoonBlock = {
    warnings: []
  };
  addSectionConflictWarning_(
    copiedAfternoonBlock,
    copiedAfternoonHeadingSection,
    copiedAfternoonDeclarationSection
  );
  const copiedAfternoon = parseProgramBlock_(
    copiedAfternoonHeadingSection,
    copiedAfternoonContent,
    copiedAfternoonBlock.warnings,
    extractHeadingLabel_(
      "BUỔI CHIỀU ĐẠI LỄ CHUỘC TỘI",
      copiedAfternoonHeadingSection
    )
  );
  const selectedFestivalPrograms = selectProgramSet_([
    morning,
    afternoon,
    {
      sectionId: "tuesday",
      rawContent: eveningContent,
      startTime: "19h30"
    },
    {
      sectionId: "evening",
      rawContent: "BUỔI TỐI SABAT",
      startTime: ""
    }
  ]);
  const emptyEvening = parseProgramBlock_(
    "evening",
    "TỪ BÂY GIỜ XIN TUYÊN BỐ BẮT ĐẦU LỄ THỜ PHƯỢNG BUỔI TỐI SABAT"
  );
  const tests = [
    {
      name: "Buoi mai duoc nhan la morning",
      passed: morningSection === "morning"
    },
    {
      name: "Ngay thang khong anh huong",
      passed: Boolean(morning)
    },
    {
      name: "Lay dung gio 5h",
      passed: Boolean(morning) && morning.startTime === "5h"
    },
    {
      name: "Doc dung nhan Buoi mai tu noi dung",
      passed: Boolean(morning) && morning.label === "Buổi mai"
    },
    {
      name: "Tieu de sai khong anh huong buoi toi",
      passed: eveningSection === "evening"
    },
    {
      name: "Nhan dien duoc buoi chieu",
      passed: afternoonSection === "afternoon"
    },
    {
      name: "Title buoi chieu duoc uu tien khi cau tuyen bo ghi buoi sang",
      passed:
        copiedAfternoonHeadingSection === "afternoon" &&
        copiedAfternoonDeclarationSection === "morning" &&
        Boolean(copiedAfternoon) &&
        copiedAfternoon.sectionId === "afternoon"
    },
    {
      name: "Gio 10h sai voi buoi chieu khong duoc dua len nhan",
      passed:
        Boolean(copiedAfternoon) &&
        copiedAfternoon.startTime === "" &&
        copiedAfternoon.label === "Buổi chiều"
    },
    {
      name: "Du lieu mau thuan tra canh bao",
      passed:
        Boolean(copiedAfternoon) &&
        copiedAfternoon.warnings.length === 2
    },
    {
      name: "Co ngay cu van duoc giu lai",
      passed: Boolean(evening)
    },
    {
      name: "Lay dung gio 19h30",
      passed: Boolean(evening) && evening.startTime === "19h30"
    },
    {
      name: "Ngay hom qua khong bi loai",
      passed: Boolean(expired)
    },
    {
      name: "Khong co ngay van duoc nhan",
      passed: Boolean(noDate)
    },
    {
      name: "Giu buoi sang truoc Thu Ba Tinh Sach",
      passed: selectedFestivalPrograms.morning === morning
    },
    {
      name: "Giu buoi chieu truoc Thu Ba Tinh Sach",
      passed: selectedFestivalPrograms.afternoon === afternoon
    },
    {
      name: "Chi lay buoi toi dau tien",
      passed:
        selectedFestivalPrograms.evening.sectionId === "tuesday" &&
        selectedFestivalPrograms.evening.startTime === "19h30"
    },
    {
      name: "Bo qua buoi toi khong co noi dung",
      passed: emptyEvening === null
    },
    {
      name: "Nhan biet heading buoi toi rong",
      passed: isWorshipHeading_("BUỔI TỐI SABAT")
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

function testQuickProgramParser() {
  return testQuickProgramParser_();
}
