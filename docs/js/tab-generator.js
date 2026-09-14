(function () {
  const config = window.APP_CONFIG;
  const api = window.SionApi;
  const prayerLibrary = Array.isArray(window.PRAYER_AUDIO_LIBRARY)
    ? window.PRAYER_AUDIO_LIBRARY
    : [];
  const PROGRAM_CACHE_KEY = `${config.PROGRAM_CACHE_KEY}:v2`;
  const SERVICE_PRESENTATION = {
    morning: { label: "Buổi sáng", tag: "Sáng", icon: "S" },
    afternoon: { label: "Buổi chiều", tag: "Chiều", icon: "C" },
    evening: { label: "Buổi tối", tag: "Tối", icon: "T" }
  };

  let services = cloneServices(config.PROGRAM_FALLBACK);
  let activeServiceId = "";
  let lastFocusedElement = null;
  let isRefreshing = false;
  let currentPrayerUrl = "";
  let prayerModalLastFocus = null;

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
    const presentation = SERVICE_PRESENTATION[service.id] || {
      label: service.label || "Buổi Sabat",
      tag: service.tag || "Sabat",
      icon: String(service.label || "B").charAt(0).toUpperCase()
    };
    const serviceLabel = String(service.label || "").trim();
    const isEarlyMorning = service.id === "morning" && /^Buổi mai\b/i.test(serviceLabel);

    return {
      ...presentation,
      // Backend moi tra label co kem gio, vi du "Buổi sáng 5h".
      // Neu API cu khong co label thi van dung nhan mac dinh nhu truoc.
      label: serviceLabel || presentation.label,
      tag: isEarlyMorning ? "Mai" : presentation.tag,
      icon: isEarlyMorning ? "M" : presentation.icon
    };
  }

  function getShortServiceLabel(service) {
    const label = String(service.label || "").trim();

    if (service.id === "morning") {
      return /^Buổi mai\b/i.test(label) ? "Buổi mai" : "Buổi sáng";
    }

    if (service.id === "afternoon") {
      return "Buổi chiều";
    }

    if (service.id === "evening") {
      return "Buổi tối";
    }

    return label || "Buổi thờ phượng";
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

  function hasProgramContent(service) {
    if (!service || typeof service !== "object") {
      return false;
    }

    return Boolean(
      String(service.rawContent || "").trim() ||
      (Array.isArray(service.songs) && service.songs.length > 0) ||
      isValidHttpUrl(service.sermonSite) ||
      isValidHttpUrl(service.sermonYoutube) ||
      isValidHttpUrl(service.sermonText)
    );
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

  function getProgramCacheTtl() {
    return Number(config.PROGRAM_CACHE_TTL_MS) || 60 * 60 * 1000;
  }

  function loadProgramCache() {
    try {
      const rawCache = localStorage.getItem(PROGRAM_CACHE_KEY);

      if (!rawCache) {
        return null;
      }

      const cache = JSON.parse(rawCache);
      const isFresh = cache &&
        Array.isArray(cache.services) &&
        Number.isFinite(cache.cachedAt) &&
        Date.now() - cache.cachedAt < getProgramCacheTtl();

      if (!isFresh) {
        localStorage.removeItem(PROGRAM_CACHE_KEY);
        return null;
      }

      return cache;
    } catch (error) {
      localStorage.removeItem(PROGRAM_CACHE_KEY);
      return null;
    }
  }

  function saveProgramCache(data) {
    try {
      localStorage.setItem(
        PROGRAM_CACHE_KEY,
        JSON.stringify({
          services: data.services,
          updatedAt: data.updatedAt || "",
          cachedAt: Date.now()
        })
      );
    } catch (error) {
      return;
    }
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
          <button class="service-option" type="button" data-service="${escapeHtml(service.id)}" ${isRefreshing ? "disabled" : ""}>
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

    servicesContainer.classList.toggle("is-loading", isRefreshing);
    servicesContainer.setAttribute("aria-busy", String(isRefreshing));

    servicesContainer.querySelectorAll("[data-service]").forEach((button) => {
      button.addEventListener("click", () => openProgramView(button.dataset.service));
    });
  }

  function setRefreshing(isLoading) {
    const refreshButton = document.getElementById("refreshButton");
    isRefreshing = isLoading;

    if (refreshButton) {
      refreshButton.disabled = isLoading;
      refreshButton.textContent = isLoading ? "Đang lấy dữ liệu..." : "Làm mới dữ liệu";
    }

    renderServices();
  }

  function getProgramElements() {
    return {
      home: document.getElementById("programHomeView"),
      workspace: document.getElementById("programWorkspace"),
      content: document.getElementById("programWorkspaceContent")
    };
  }

  function renderProgramView(service) {
    const { content } = getProgramElements();
    const presentation = getPresentation(service);
    const shortLabel = getShortServiceLabel(service);
    const songSummary = Array.isArray(service.songs) && service.songs.length
      ? service.songs.join(" - ")
      : "Chưa có bài ca";
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
      <div class="program-page-layout">
        <aside class="program-sidebar program-prayer-sidebar" aria-label="Nhạc cầu nguyện">
          <div class="program-sidebar-sticky">
            <p class="program-sidebar-title">Cầu nguyện</p>
            <div class="program-prayer-actions">
              <button class="button prayer-action-button" type="button" data-program-prayer="reflection">CN ngẫm nghĩ</button>
              <button class="button prayer-action-button" type="button" data-program-prayer="our-wishes">CN chúng con mong muốn</button>
              <button class="button prayer-action-button" type="button" data-program-prayer="united">CN thống thanh</button>
            </div>
          </div>
        </aside>

        <article class="program-document">
          <header class="program-compact-header">
            <span class="program-session-mark" aria-hidden="true">${escapeHtml(presentation.icon)}</span>
            <h1 id="programPageTitle" tabindex="-1">${escapeHtml(shortLabel)}</h1>
            <p class="program-song-line"><strong>Bài ca mới:</strong> ${escapeHtml(songSummary)}</p>
          </header>

          ${service.openingText ? `<div class="announcement">${escapeHtml(service.openingText)}</div>` : ""}
          ${service.rawContent ? `
            <section class="program-content-section" aria-labelledby="programContentTitle">
              <h2 id="programContentTitle">Nội dung chương trình</h2>
              <div class="raw-content">${escapeHtml(service.rawContent)}</div>
            </section>
          ` : ""}

          <section class="program-tabs-section" aria-labelledby="programTabsTitle">
            <h2 id="programTabsTitle">Danh sách tab sắp mở</h2>
            <p class="muted">Bạn có thể chọn hoặc bỏ chọn từng tab trước khi mở.</p>
            <div class="tab-list">${tabItems || '<p class="muted">Chưa có URL hợp lệ cho buổi này.</p>'}</div>
            <div class="popup-help" id="popupHelp">
              Trình duyệt có thể đang chặn popup. Hãy cho phép mở cửa sổ cho trang này rồi thử lại.
            </div>
          </section>
        </article>

        <aside class="program-sidebar program-tab-sidebar" aria-label="Thao tác với danh sách tab">
          <div class="program-sidebar-sticky">
            <p class="program-sidebar-title">Thao tác</p>
            <div class="program-tab-actions">
              <button class="button secondary" type="button" id="selectAllTabsButton">Chọn tất cả</button>
              <button class="button secondary" type="button" id="clearAllTabsButton">Bỏ chọn tất cả</button>
              <button class="button" type="button" id="openSelectedTabsButton">Mở các tab đã chọn</button>
              <button class="button secondary" type="button" id="programViewCloseButton">Đóng</button>
            </div>
          </div>
        </aside>
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
    document.getElementById("programViewCloseButton").addEventListener("click", closeProgramView);
    content.querySelectorAll("[data-program-prayer]").forEach((button) => {
      button.addEventListener("click", () => playProgramPrayer(button.dataset.programPrayer));
    });
  }

  function getPrayerSection(sectionId) {
    return prayerLibrary.find((section) => section.id === sectionId) || null;
  }

  function buildPrayerUrl(section, track) {
    const file = String(track.file || "").trim();

    if (/^https?:\/\//i.test(file) || file.startsWith("./")) {
      return file;
    }

    return `${section.folder}${file}`;
  }

  async function playProgramPrayer(sectionId) {
    const section = getPrayerSection(sectionId);
    const track = section && Array.isArray(section.tracks)
      ? section.tracks[0]
      : null;

    if (!section || !track) {
      setStatus("Chưa có file nhạc cho phần cầu nguyện này.", "error");
      return;
    }

    if (sectionId === "our-wishes") {
      openQuickPrayerModal();
    }

    const audio = document.getElementById("quickPrayerAudio");
    const dock = document.getElementById("quickPrayerAudioDock");
    const trackUrl = buildPrayerUrl(section, track);

    if (currentPrayerUrl !== trackUrl) {
      audio.src = trackUrl;
      currentPrayerUrl = trackUrl;
    }

    document.getElementById("quickPrayerAudioTitle").textContent =
      track.title || section.title;
    dock.hidden = false;

    try {
      await audio.play();
      setStatus(`Đang phát: ${track.title || section.title}.`);
    } catch (error) {
      setStatus("Chưa phát được nhạc cầu nguyện. Vui lòng thử lại.", "error");
    }
  }

  function closeQuickPrayerAudio() {
    const audio = document.getElementById("quickPrayerAudio");
    audio.pause();
    document.getElementById("quickPrayerAudioDock").hidden = true;
  }

  function setQuickPrayerLayout(shouldSplit) {
    const verses = document.querySelector(".quick-prayer-verses");
    const toggle = document.getElementById("quickPrayerLayoutToggle");
    const label = toggle.querySelector("[data-quick-prayer-layout-label]");

    verses.classList.toggle("is-split", shouldSplit);
    toggle.setAttribute("aria-pressed", String(shouldSplit));
    label.textContent = shouldSplit ? "Gộp 1 cột" : "Chia 2 cột";
  }

  function openQuickPrayerModal() {
    const overlay = document.getElementById("quickPrayerModalOverlay");
    const modal = document.getElementById("quickPrayerModal");
    const programWorkspace = document.getElementById("programWorkspace");
    prayerModalLastFocus = document.activeElement;
    setQuickPrayerLayout(true);
    programWorkspace.setAttribute("aria-hidden", "true");
    overlay.hidden = false;
    document.body.classList.add("quick-prayer-open");
    modal.focus();
  }

  function closeQuickPrayerModal() {
    const overlay = document.getElementById("quickPrayerModalOverlay");
    const programWorkspace = document.getElementById("programWorkspace");

    if (overlay.hidden) {
      return;
    }

    overlay.hidden = true;
    programWorkspace.removeAttribute("aria-hidden");
    document.body.classList.remove("quick-prayer-open");

    if (prayerModalLastFocus && typeof prayerModalLastFocus.focus === "function") {
      prayerModalLastFocus.focus();
    }
  }

  function openProgramView(serviceId) {
    const service = services.find((item) => item.id === serviceId);
    const { home, workspace } = getProgramElements();

    if (!service) {
      return;
    }

    activeServiceId = serviceId;
    lastFocusedElement = document.activeElement;
    renderProgramView(service);
    home.hidden = true;
    workspace.hidden = false;
    document.body.classList.add("program-view-open");
    window.scrollTo(0, 0);
    document.getElementById("programPageTitle").focus({ preventScroll: true });
  }

  function closeProgramView() {
    const { home, workspace } = getProgramElements();
    workspace.hidden = true;
    home.hidden = false;
    document.body.classList.remove("program-view-open");
    activeServiceId = "";
    window.scrollTo(0, 0);

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function openSelectedTabs() {
    const service = services.find((item) => item.id === activeServiceId);
    const { content } = getProgramElements();

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

  function applyProgramData(data) {
    const incomingServices = Array.isArray(data.services) ? data.services : [];
    services = incomingServices.filter(hasProgramContent);
    setUpdatedAt(data.updatedAt || "");
  }

  async function refreshServices(options = {}) {
    const { force = false } = options;

    if (isRefreshing) {
      return;
    }

    const cachedData = force ? null : loadProgramCache();

    if (cachedData) {
      applyProgramData(cachedData);
      renderServices();
      setStatus("Đang dùng dữ liệu đã lưu trong 1 giờ. Bấm Làm mới dữ liệu nếu muốn cập nhật ngay.");
      return;
    }

    setRefreshing(true);
    setStatus("Đang lấy dữ liệu...");

    try {
      const result = await api.getProgram();
      applyProgramData(result);
      saveProgramCache({
        services,
        updatedAt: result.updatedAt || ""
      });
      setStatus("Chương trình đã sẵn sàng.");
    } catch (error) {
      services = cloneServices(config.PROGRAM_FALLBACK);
      setUpdatedAt("");
      setStatus("Chưa cập nhật được chương trình mới. Vui lòng thử lại sau.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  function bindProgramEvents() {
    const { workspace } = getProgramElements();
    const prayerOverlay = document.getElementById("quickPrayerModalOverlay");

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (!prayerOverlay.hidden) {
        closeQuickPrayerModal();
        return;
      }

      if (!workspace.hidden) {
        closeProgramView();
      }
    });

    document.getElementById("quickPrayerModalClose").addEventListener("click", closeQuickPrayerModal);
    document.getElementById("quickPrayerLayoutToggle").addEventListener("click", () => {
      const toggle = document.getElementById("quickPrayerLayoutToggle");
      setQuickPrayerLayout(toggle.getAttribute("aria-pressed") !== "true");
    });
    prayerOverlay.addEventListener("click", (event) => {
      if (event.target === prayerOverlay) {
        closeQuickPrayerModal();
      }
    });
    document.getElementById("quickPrayerAudioClose").addEventListener("click", closeQuickPrayerAudio);
    document.getElementById("quickPrayerAudio").addEventListener("error", () => {
      setStatus("File nhạc cầu nguyện không đọc được.", "error");
    });
  }

  function initTabGenerator() {
    const refreshButton = document.getElementById("refreshButton");

    applyBackgroundFromConfig();
    renderServices();
    bindProgramEvents();
    setUpdatedAt("");

    window.SionRouteGuard.requireAuth().then((user) => {
      if (!user) {
        return;
      }

      refreshServices();
    });

    refreshButton.addEventListener("click", () => refreshServices({ force: true }));
  }

  document.addEventListener("DOMContentLoaded", initTabGenerator);
})();
