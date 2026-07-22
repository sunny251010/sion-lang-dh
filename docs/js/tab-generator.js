(function () {
  const config = window.APP_CONFIG;
  const api = window.SionApi;

  let services = cloneServices(config.DEFAULT_SERVICES);
  let activeServiceId = "";

  function cloneServices(list) {
    return JSON.parse(JSON.stringify(list));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isValidHttpUrl(value) {
    try {
      const url = new URL(String(value).trim());
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        String(value).trim().toLowerCase() !== "about:blank"
      );
    } catch (error) {
      return false;
    }
  }

  function createSongUrl(songNumber) {
    return `${config.SONG_BASE_URL}${songNumber}/`;
  }

  function summarizeService(service) {
    if (service.summary) {
      return service.summary;
    }

    if (Array.isArray(service.songs) && service.songs.length > 0) {
      return `Bài ca mới: ${service.songs.join(" - ")}.`;
    }

    return "Chưa có tóm tắt cho buổi này.";
  }

  function formatUpdatedAt(value) {
    if (!value) {
      return "Đang dùng dữ liệu dự phòng trong file.";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "full",
      timeStyle: "medium"
    }).format(parsed);
  }

  function buildTabTargets(service) {
    const targets = [];

    if (isValidHttpUrl(config.WORSHIP_HOME_URL)) {
      targets.push({
        label: "Trang chủ WATV",
        url: config.WORSHIP_HOME_URL
      });
    }

    service.songs.forEach((songNumber) => {
      const songUrl = createSongUrl(songNumber);
      if (isValidHttpUrl(songUrl)) {
        targets.push({
          label: `Bài ca mới ${songNumber}`,
          url: songUrl
        });
      }
    });

    [
      { label: "Bài giảng tại worshipvn.net", url: service.sermonSite },
      { label: "Bài giảng YouTube", url: service.sermonYoutube },
      { label: "Bài giảng văn bản", url: service.sermonText }
    ].forEach((item) => {
      const normalizedUrl = String(item.url || "").trim();
      if (isValidHttpUrl(normalizedUrl)) {
        targets.push({
          label: item.label,
          url: normalizedUrl
        });
      }
    });

    return targets;
  }

  function setStatus(message, tone = "info") {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", tone === "error");
  }

  function setUpdatedAt(value, sourceLabel) {
    const updatedAtText = document.getElementById("updatedAtText");
    const sourceText = sourceLabel ? `Nguồn: ${sourceLabel}. ` : "";
    updatedAtText.textContent = `${sourceText}Cập nhật: ${formatUpdatedAt(value)}`;
  }

  function renderWelcomePanel() {
    const detailPanel = document.getElementById("detailPanel");
    detailPanel.innerHTML = `
      <p class="eyebrow">Kịch bản</p>
      <h2>Chọn một buổi để xem trước tab</h2>
      <p class="lead">Danh sách tab sẽ hiện ở đây với checkbox để bạn chọn trước khi mở.</p>
    `;
  }

  function renderServices(options = {}) {
    const { show = true } = options;
    const servicesContainer = document.getElementById("services");

    servicesContainer.innerHTML = services
      .map((service) => {
        const songChips = service.songs
          .map((songNumber) => `<span class="chip">${escapeHtml(songNumber)}</span>`)
          .join("");

        return `
          <article class="card service-card">
            <div class="service-top">
              <div>
                <span class="service-tag">${escapeHtml(service.tag)}</span>
                <h3>${escapeHtml(service.label)}</h3>
              </div>
              <button class="button secondary" type="button" data-detail="${escapeHtml(service.id)}">Xem trước tab</button>
            </div>
            <p class="muted">${escapeHtml(summarizeService(service))}</p>
            <div class="chip-row">${songChips}</div>
            <button class="button" type="button" data-service="${escapeHtml(service.id)}">Chọn ${escapeHtml(service.label.toLowerCase())}</button>
          </article>
        `;
      })
      .join("");

    servicesContainer.hidden = !show;

    servicesContainer.querySelectorAll("[data-service], [data-detail]").forEach((button) => {
      button.addEventListener("click", () => renderDetails(button.dataset.service || button.dataset.detail));
    });
  }

  function renderDetails(serviceId) {
    const service = services.find((item) => item.id === serviceId);
    const detailPanel = document.getElementById("detailPanel");

    if (!service) {
      return;
    }

    activeServiceId = serviceId;

    const targets = buildTabTargets(service);
    const tabItems = targets
      .map((target, index) => `
        <label class="tab-item">
          <input type="checkbox" data-tab-checkbox value="${index}" checked>
          <span>
            <span class="tab-label">${escapeHtml(target.label)}</span>
            <span class="tab-url">${escapeHtml(target.url)}</span>
          </span>
        </label>
      `)
      .join("");

    detailPanel.innerHTML = `
      <p class="eyebrow">${escapeHtml(service.label)} Sabat</p>
      <h2>${escapeHtml(service.label)}${service.startTime ? ` - ${escapeHtml(service.startTime)}` : ""}</h2>
      <p class="lead">${escapeHtml(summarizeService(service))}</p>
      ${service.openingText ? `<div class="announcement">${escapeHtml(service.openingText)}</div>` : ""}
      ${service.rawContent ? `
        <div class="resource-group">
          <strong>Nội dung chương trình</strong>
          <div class="raw-content">${escapeHtml(service.rawContent)}</div>
        </div>
      ` : ""}
      <div class="resource-group">
        <strong>Danh sách tab sắp mở</strong>
        <span class="muted">Thứ tự mở: Trang chủ WATV, bài ca mới, sermon site, YouTube, văn bản.</span>
      </div>
      <div class="button-row">
        <button class="button secondary" type="button" id="selectAllTabsButton">Chọn tất cả</button>
        <button class="button secondary" type="button" id="clearAllTabsButton">Bỏ chọn tất cả</button>
        <button class="button" type="button" id="openSelectedTabsButton">Mở các tab đã chọn</button>
      </div>
      <div class="tab-list">${tabItems}</div>
      <div class="popup-help" id="popupHelp">
        Trình duyệt có thể đang chặn popup. Hãy bấm vào biểu tượng chặn popup trên thanh địa chỉ và chọn cho phép mở cửa sổ cho trang này, rồi thử lại.
      </div>
    `;

    document.getElementById("selectAllTabsButton").addEventListener("click", () => {
      detailPanel.querySelectorAll("[data-tab-checkbox]").forEach((checkbox) => {
        checkbox.checked = true;
      });
    });

    document.getElementById("clearAllTabsButton").addEventListener("click", () => {
      detailPanel.querySelectorAll("[data-tab-checkbox]").forEach((checkbox) => {
        checkbox.checked = false;
      });
    });

    document.getElementById("openSelectedTabsButton").addEventListener("click", openSelectedTabs);
  }

  function openSelectedTabs() {
    const service = services.find((item) => item.id === activeServiceId);
    const detailPanel = document.getElementById("detailPanel");

    if (!service) {
      setStatus("Chưa có buổi nào được chọn.", "error");
      return;
    }

    const targets = buildTabTargets(service);
    const selectedIndexes = Array.from(detailPanel.querySelectorAll("[data-tab-checkbox]:checked"))
      .map((checkbox) => Number(checkbox.value))
      .filter((index) => Number.isInteger(index));

    if (selectedIndexes.length === 0) {
      setStatus("Bạn chưa chọn tab nào để mở.", "error");
      return;
    }

    const validUrls = selectedIndexes
      .map((index) => targets[index] ? targets[index].url : "")
      .map((url) => String(url || "").trim())
      .filter(isValidHttpUrl);

    if (validUrls.length === 0) {
      setStatus("Không có URL hợp lệ nào để mở.", "error");
      return;
    }

    console.log("Các URL chuẩn bị mở:", validUrls);

    let blockedCount = 0;

    validUrls.forEach((url) => {
      const openedTab = window.open(url, "_blank");
      if (!openedTab) {
        blockedCount += 1;
      }
    });

    const openedCount = validUrls.length - blockedCount;
    const popupHelp = document.getElementById("popupHelp");

    if (popupHelp) {
      popupHelp.classList.toggle("visible", blockedCount > 0);
    }

    if (blockedCount > 0) {
      alert(`Trình duyệt đã chặn ${blockedCount} tab. Hãy cho phép popup cho website này rồi thử lại.`);
      setStatus(`Đã mở ${openedCount}/${validUrls.length} tab cho ${service.label.toLowerCase()}. Hãy cho phép popup nếu bạn muốn mở đủ tất cả tab.`, "error");
      return;
    }

    setStatus(`Đã mở ${openedCount} tab cho ${service.label.toLowerCase()}.`);
  }

  async function refreshServices() {
    const servicesContainer = document.getElementById("services");
    const shouldShowServices = !servicesContainer.hidden;

    setStatus("Đang tải dữ liệu từ Apps Script...");

    try {
      const result = await api.loadServices();
      services = result.services;

      renderServices({ show: shouldShowServices });

      if (activeServiceId && services.some((item) => item.id === activeServiceId)) {
        renderDetails(activeServiceId);
      } else {
        activeServiceId = "";
        renderWelcomePanel();
      }

      setUpdatedAt(result.updatedAt, result.source);
      setStatus(`Đã tải ${services.length} buổi từ API Apps Script bằng ${result.source}.`);
    } catch (error) {
      services = cloneServices(config.DEFAULT_SERVICES);
      renderServices({ show: shouldShowServices });

      if (activeServiceId && services.some((item) => item.id === activeServiceId)) {
        renderDetails(activeServiceId);
      } else {
        activeServiceId = "";
        renderWelcomePanel();
      }

      setUpdatedAt("", "Fallback cục bộ");
      setStatus(`Không tải được API hoặc API trả về lỗi. Trang đang dùng dữ liệu cứng hiện tại. ${error.message}`, "error");
    }
  }

  function initTabGenerator() {
    const apiUrlDisplay = document.getElementById("apiUrlDisplay");
    const refreshButton = document.getElementById("refreshButton");
    const revealButton = document.getElementById("revealButton");
    const servicesContainer = document.getElementById("services");

    apiUrlDisplay.value = config.API_URL;
    renderServices({ show: true });
    setUpdatedAt("", "Đang tải");

    refreshButton.addEventListener("click", refreshServices);

    revealButton.addEventListener("click", () => {
      servicesContainer.hidden = !servicesContainer.hidden;
      revealButton.textContent = servicesContainer.hidden ? "Hiện 3 buổi Sabat" : "Ẩn 3 buổi Sabat";
      setStatus(servicesContainer.hidden ? "Đã ẩn 3 buổi Sabat." : "Đã hiện 3 buổi Sabat.");
    });

    refreshServices();
  }

  document.addEventListener("DOMContentLoaded", initTabGenerator);
})();
