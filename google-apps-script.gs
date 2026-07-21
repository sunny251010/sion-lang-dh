const SHEET_NAME = "Services";

function doGet(request) {
  const payload = {
    updatedAt: new Date().toISOString(),
    services: readServices_()
  };

  const prefix = request && request.parameters ? request.parameters.prefix : "";
  const output = prefix
    ? `${prefix}(${JSON.stringify(payload)})`
    : JSON.stringify(payload);

  return ContentService
    .createTextOutput(output)
    .setMimeType(
      prefix
        ? ContentService.MimeType.JAVASCRIPT
        : ContentService.MimeType.JSON
    );
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
    startTime: record.startTime || "",
    tag: record.tag || "",
    openingText: record.openingText || "",
    songs: parseNumberList_(record.songs),
    summary: record.summary || "",
    sermon: {
      title: record.sermonTitle || "",
      site: record.sermonSite || "",
      youtube: record.sermonYoutube || "",
      text: record.sermonText || ""
    },
    agenda: parseTextList_(record.agenda)
  };
}

function parseNumberList_(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function parseTextList_(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}
