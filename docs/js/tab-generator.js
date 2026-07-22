(function () {
  const config = window.APP_CONFIG;
  const api = window.SionApi;
  const SERVICE_PRESENTATION = {
    morning: { label: "Buổi sáng", tag: "Sáng", icon: "S" },
    afternoon: { label: "Buổi trưa", tag: "Trưa", icon: "T" },
    evening: { label: "Buổi chiều", tag: "Chiều", icon: "C" }
  };

  let services = cloneServices(config.PROGRAM_FALLBACK);
  let activeServiceId = "";
  let lastFocusedElement = null;

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

  function getPresentation(service) {
    return SERVICE_PRESENTATION[service.id] || {
      label: service.label || "Buổi Sabat",
      tag: service.tag || "Sabat",
      icon: String(service.label || "B").charAt(0).toUpperCase()
    };
  }

  function summarizeService(service) {
    if (service.summary) {
      return service.summary;
    }

    if (Array.isArray(service.songs) && service.songs.length > 0) {
      return `Bài ca mới: ${service.songs.join(" - ")}.`;
    }

    return "Chạm để xem chương trình và danh sách tab cần mở.";
  }

  function formatUpdatedAt(value) {
    if (!value) {
      return "Chưa có thời gian cập nhật.";
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
    const seenUrls = new Set();

    function pushTarget(target) {
      const normalizedUrl = String(target.url || "").trim();
      if (!isValidHttpUrl(normalizedUrl) || seenUrls.has(normalizedUrl)) {
        return;
      }

      seenUrls.add(normalizedUrl);
      targets.push({
        ...target,
        url: normalizedUrl
      });
    }

    pushTarget({
      type: "Trang thờ phượng",
      label: "Trang chủ WATV",
      url: config.WORSHIP_HOME_URL
    });

    (service.songs || []).forEach((songNumber) => {
      pushTarget({
        type: "Bài ca",
        label: `Bài ca mới ${songNumber}`,
        url: createSongUrl(songNumber)
      });
    });

    [
      { type: "Bài giảng", label: "Bài giảng tại worshipvn.net", url: service.sermonSite },
      { type: "YouTube", label: "Bài giảng YouTube", url: service.sermonYoutube },
      { type: "Nội dung bổ sung", label: "Bài giảng văn bản", url: service.sermonText }
    ].forEach(pushTarget);

    return targets;
  }

  function setStatus(message, tone = "info") {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", tone === "error");
  }

  function setUpdatedAt(value) {
    const updatedAtText = document.getElementById("updatedAtText");
    updatedAtText.textContent = `Cập nhật: ${formatUpdatedAt(value)}`;
  }

  function applyBackgroundFromConfig() {
    if (config.QUICK_PROGRAM_BACKGROUND) {
      document.body.style.setProperty(
        "--quick-program-background-image",
        `url("${config.QUICK_PROGRAM_BACKGROUND}")`
      );
    }
  }

  function sortServices(list) {
    return [...list].sort((first, second) => {
      const firstOrder = config.SERVICE_ORDER[first.id] ?? 99;
      const secondOrder = config.SERVICE_ORDER[second.id] ?? 99;
      return firstOrder - secondOrder;
    });
  }

  function renderServices() {
    const servicesContainer = document.getElementById("services");

    servicesContainer.innerHTML = sortServices(services)
      .map((service) => {
        const presentation = getPresentation(service);
        const songChips = (service.songs || [])
          .map((songNumber) => `<span class="chip">${escapeHtml(songNumber)}</span>`)
          .join("");

        return `
          <button class="service-option" type="button" data-service="${escapeHtml(service.id)}">
            <div class="service-top">
              <span class="service-icon" aria-hidden="true">${escapeHtml(presentation.icon)}</span>
              <div>
                <span class="service-tag">${escapeHtml(presentation.tag)}</span>
                <h3>${escapeHtml(presentation.label)}</h3>
              </div>
            </div>
            <p class="muted">${escapeHtml(summarizeService(service))}</p>
            <div class="chip-row" aria-label="Bài ca">${songChips || '<span class="chip">Chưa có bài ca</span>'}</div>
          </button>
        `;
      })
      .join("");

    servicesContainer.querySelectorAll("[data-service]").forEach((button) => {
      button.addEventListener("click", () => openProgramModal(button.dataset.service));
    });
  }

  function getModalElements() {
    return {
      overlay: document.getElementById("programModalOverlay"),
      modal: document.getElementById("programModal"),
      content: document.getElementById("programModalContent"),
      closeIcon: document.getElementById("programModalCloseIcon")
    };
  }

  function renderProgramModal(service) {
    const { content } = getModalElements();
    const presentation = getPresentation(service);
    const targets = buildTabTargets(service);
    const tabItems = targets
      .map((target, index) => `
        <label class="tab-item">
          <input type="checkbox" data-tab-checkbox value="${index}" checked>
          <span>
            <span class="tab-label-row">
              <span class="tab-type">${escapeHtml(target.type)}</span>
              <span class="tab-label">${escapeHtml(target.label)}</span>
            </span>
            <span class="tab-url">${escapeHtml(target.url)}</span>
          </span>
        </label>
      `)
      .join("");

    content.innerHTML = `
      <div class="program-modal-content">
        <header class="program-modal-header">
          <p class="eyebrow">${escapeHtml(presentation.tag)} Sabat</p>
          <h2 id="programModalTitle">${escapeHtml(presentation.label)}${service.startTime ? ` - ${escapeHtml(service.startTime)}` : ""}</h2>
          <p class="lead">${escapeHtml(summarizeService(service))}</p>
        </header>
        <div class="program-modal-scroll">
          ${service.openingText ? `<div class="announcement">${escapeHtml(service.openingText)}</div>` : ""}
          ${service.rawContent ? `
            <div class="resource-group">
              <strong>Nội dung chương trình</strong>
              <div class="raw-content">${escapeHtml(service.rawContent)}</div>
            </div>
          ` : ""}
          <div class="resource-group">
            <strong>Danh sách tab sắp mở</strong>
            <span class="muted">Bạn có thể chọn hoặc bỏ chọn từng tab trước khi mở.</span>
          </div>
          <div class="tab-list">${tabItems || '<p class="muted">Chưa có URL hợp lệ cho buổi này.</p>'}</div>
          <div class="popup-help" id="popupHelp">
            Trình duyệt có thể đang chặn popup. Hãy cho phép mở cửa sổ cho trang này rồi thử lại.
          </div>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" id="selectAllTabsButton">Chọn tất cả</button>
          <button class="button secondary" type="button" id="clearAllTabsButton">Bỏ chọn tất cả</button>
          <button class="button" type="button" id="openSelectedTabsButton">Mở các tab đã chọn</button>
          <button class="button secondary" type="button" id="programModalCloseButton">Đóng</button>
        </div>
      </div>
    `;

    document.getElementById("selectAllTabsButton").addEventListener("click", () => {
      content.querySelectorAll("[data-tab-checkbox]").forEach((checkbox) => {
        checkbox.checked = true;
      });
    });

    document.getElementById("clearAllTabsButton").addEventListener("click", () => {
      content.querySelectorAll("[data-tab-checkbox]").forEach((checkbox) => {
        checkbox.checked = false;
      });
    });

    document.getElementById("openSelectedTabsButton").addEventListener("click", openSelectedTabs);
    document.getElementById("programModalCloseButton").addEventListener("click", closeProgramModal);
  }

  function openProgramModal(serviceId) {
    const service = services.find((item) => item.id === serviceId);
    const { overlay, modal } = getModalElements();

    if (!service) {
      return;
    }

    activeServiceId = serviceId;
    lastFocusedElement = document.activeElement;
    renderProgramModal(service);
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    modal.focus();
  }

  function closeProgramModal() {
    const { overlay } = getModalElements();
    overlay.hidden = true;
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function openSelectedTabs() {
    const service = services.find((item) => item.id === activeServiceId);
    const { content } = getModalElements();

    if (!service) {
      setStatus("Chưa có buổi nào được chọn.", "error");
      return;
    }

    const targets = buildTabTargets(service);
    const selectedIndexes = Array.from(content.querySelectorAll("[data-tab-checkbox]:checked"))
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
      const openedTab = window.open(url, "_blank", "noopener,noreferrer");
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
      setStatus(`Đã mở ${openedCount}/${validUrls.length} tab. Hãy cho phép popup nếu bạn muốn mở đủ tất cả tab.`, "error");
      return;
    }

    setStatus(`Đã mở ${openedCount} tab.`);
  }

  async function refreshServices() {
    setStatus("Đang cập nhật chương trình...");

    try {
      const result = await api.getProgram();
      services = Array.isArray(result.services) ? result.services : cloneServices(config.PROGRAM_FALLBACK);
      renderServices();
      setUpdatedAt(result.updatedAt);
      setStatus("Chương trình đã sẵn sàng.");
    } catch (error) {
      services = cloneServices(config.PROGRAM_FALLBACK);
      renderServices();
      setUpdatedAt("");
      setStatus("Chưa cập nhật được chương trình mới. Vui lòng thử lại sau.", "error");
    }
  }

  function bindModalEvents() {
    const { overlay, closeIcon } = getModalElements();

    closeIcon.addEventListener("click", closeProgramModal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeProgramModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !overlay.hidden) {
        closeProgramModal();
      }
    });
  }

  function initTabGenerator() {
    const refreshButton = document.getElementById("refreshButton");

    applyBackgroundFromConfig();
    renderServices();
    bindModalEvents();
    setUpdatedAt("");

    window.SionRouteGuard.requireAuth().then((user) => {
      if (!user) {
        return;
      }

      refreshServices();
    });

    refreshButton.addEventListener("click", refreshServices);
  }

  document.addEventListener("DOMContentLoaded", initTabGenerator);
})();
