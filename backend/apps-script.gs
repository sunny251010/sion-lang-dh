const SHEET_NAME = "Services";

function doGet(request) {
  const callbackName = getCallbackName_(request);
  const payload = buildPayload_();
  const output = callbackName
    ? `${callbackName}(${JSON.stringify(payload)})`
    : JSON.stringify(payload);

  return ContentService
    .createTextOutput(output)
    .setMimeType(
      callbackName
        ? ContentService.MimeType.JAVASCRIPT
        : ContentService.MimeType.JSON
    );
}

function buildPayload_() {
  try {
    return {
      success: true,
      updatedAt: new Date().toISOString(),
      services: readServices_()
    };
  } catch (error) {
    return {
      success: false,
      updatedAt: new Date().toISOString(),
      message: error.message,
      services: []
    };
  }
}

function getCallbackName_(request) {
  if (!request || !request.parameters) {
    return "";
  }

  return request.parameters.callback || request.parameters.prefix || "";
}

function readServices_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Khong tim thay sheet "${SHEET_NAME}".`);
  }

  const rows = sheet.getDataRange().getDisplayValues();

  if (rows.length < 2) {
    return [];
  }

  const [headers, ...records] = rows;

  return records
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row, index) => mapRowToService_(headers, row, index));
}

function mapRowToService_(headers, row, index) {
  const record = {};

  headers.forEach((header, columnIndex) => {
    record[String(header).trim()] = row[columnIndex] || "";
  });

  return {
    id: record.id || `service-${index + 1}`,
    label: record.label || `Buoi ${index + 1}`,
    songs: parseTextList_(record.songs),
    sermonSite: record.sermonSite || record.sermonUrl || record.sermon || "",
    sermonYoutube: record.sermonYoutube || record.youtube || "",
    sermonText: record.sermonText || record.text || "",
    rawContent: record.rawContent || record.content || "",
    startTime: record.startTime || "",
    tag: record.tag || "",
    openingText: record.openingText || "",
    summary: record.summary || ""
  };
}

function parseTextList_(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}
