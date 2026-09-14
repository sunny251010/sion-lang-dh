(function () {
  const library = Array.isArray(window.PRAYER_AUDIO_LIBRARY)
    ? window.PRAYER_AUDIO_LIBRARY
    : [];

  let currentTrackUrl = "";
  let prayerModalLastFocus = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getPrayerSection(sectionId) {
    return library.find((section) => section.id === sectionId) || null;
  }

  function setStatus(message, tone = "info") {
    const status = document.getElementById("prayerStatus");
    status.textContent = message;
    status.classList.toggle("is-error", tone === "error");
  }

  function getRandomIndex(length) {
    if (length <= 0) {
      return -1;
    }

    if (window.crypto && window.crypto.getRandomValues) {
      const randomValue = new Uint32Array(1);
      window.crypto.getRandomValues(randomValue);
      return randomValue[0] % length;
    }

    return Math.floor(Math.random() * length);
  }

  function buildTrackUrl(section, track) {
    const file = String(track.file || "").trim();

    if (/^https?:\/\//i.test(file) || file.startsWith("./")) {
      return file;
    }

    return `${section.folder}${file}`;
  }

  function setSectionExpanded(sectionId, shouldExpand) {
    const toggle = document.querySelector(`[data-prayer-toggle="${sectionId}"]`);
    const card = document.querySelector(`[data-prayer-card="${sectionId}"]`);

    if (!toggle || !card) {
      return;
    }

    const details = document.getElementById(toggle.getAttribute("aria-controls"));
    toggle.setAttribute("aria-expanded", String(shouldExpand));
    card.classList.toggle("is-open", shouldExpand);

    if (details) {
      details.hidden = !shouldExpand;
    }
  }

  function toggleSection(sectionId) {
    const toggle = document.querySelector(`[data-prayer-toggle="${sectionId}"]`);

    if (!toggle) {
      return;
    }

    setSectionExpanded(
      sectionId,
      toggle.getAttribute("aria-expanded") !== "true"
    );
  }

  function renderTrackLists() {
    document.querySelectorAll("[data-track-list]").forEach((container) => {
      const section = getPrayerSection(container.dataset.trackList);
      const tracks = section && Array.isArray(section.tracks) ? section.tracks : [];

      if (tracks.length === 0) {
        container.innerHTML = '<p class="track-empty">Nhạc của phần này sẽ được bổ sung sớm.</p>';
        return;
      }

      container.innerHTML = tracks
        .map((track, index) => `
          <div class="track-item">
            <span class="track-title">${escapeHtml(track.title || `Bài ${index + 1}`)}</span>
            <button class="track-play-button" type="button" data-track-play="${escapeHtml(section.id)}" data-track-index="${index}">
              <span aria-hidden="true">▶</span> Nghe bài này
            </button>
          </div>
        `)
        .join("");
    });
  }

  async function playTrack(section, track) {
    const audio = document.getElementById("prayerAudio");
    const dock = document.getElementById("audioDock");
    const trackUrl = buildTrackUrl(section, track);

    if (!trackUrl) {
      setStatus("Bài nhạc này chưa có đường dẫn.", "error");
      return;
    }

    if (currentTrackUrl !== trackUrl) {
      audio.src = trackUrl;
      currentTrackUrl = trackUrl;
    }

    document.getElementById("audioSectionText").textContent = section.title;
    document.getElementById("audioTitleText").textContent = track.title || "Bài cầu nguyện";
    dock.hidden = false;
    document.body.classList.add("has-audio-dock");

    try {
      await audio.play();
      setStatus(`Đang phát: ${track.title || section.title}.`);
    } catch (error) {
      setStatus("Chưa phát được bài nhạc. Vui lòng kiểm tra lại file audio.", "error");
    }
  }

  function playRandomTrack(sectionId) {
    const section = getPrayerSection(sectionId);

    if (sectionId === "our-wishes") {
      setSectionExpanded(sectionId, true);
    }

    if (!section || !Array.isArray(section.tracks) || section.tracks.length === 0) {
      setStatus(`Chưa có file nhạc cho ${section ? section.title : "phần này"}.`, "error");
      return;
    }

    const selectedIndex = getRandomIndex(section.tracks.length);
    playTrack(section, section.tracks[selectedIndex]);
  }

  function playSelectedTrack(sectionId, trackIndex) {
    const section = getPrayerSection(sectionId);
    const track = section && section.tracks[trackIndex];

    if (!section || !track) {
      setStatus("Không tìm thấy bài nhạc đã chọn.", "error");
      return;
    }

    if (sectionId === "our-wishes") {
      setSectionExpanded(sectionId, true);
    }

    playTrack(section, track);
  }

  function closeAudioDock() {
    const audio = document.getElementById("prayerAudio");
    audio.pause();
    document.getElementById("audioDock").hidden = true;
    document.body.classList.remove("has-audio-dock");
  }

  function setPrayerModalLayout(shouldSplit) {
    const verses = document.getElementById("prayerModalVerses");
    const toggle = document.getElementById("prayerLayoutToggle");
    const label = toggle.querySelector("[data-layout-label]");

    verses.classList.toggle("is-split", shouldSplit);
    toggle.setAttribute("aria-pressed", String(shouldSplit));
    label.textContent = shouldSplit ? "Gộp 1 cột" : "Chia 2 cột";
  }

  function openPrayerReadingModal() {
    const overlay = document.getElementById("prayerReadingModalOverlay");
    const modal = document.getElementById("prayerReadingModal");
    const modalVerses = document.getElementById("prayerModalVerses");
    const sourceVerses = document.querySelector(".prayer-reading .prayer-verses");

    if (!overlay || !modal || !modalVerses || !sourceVerses) {
      return;
    }

    prayerModalLastFocus = document.activeElement;
    modalVerses.innerHTML = sourceVerses.innerHTML;
    setPrayerModalLayout(true);
    overlay.hidden = false;
    document.body.classList.add("prayer-modal-open");
    modal.focus();
  }

  function closePrayerReadingModal() {
    const overlay = document.getElementById("prayerReadingModalOverlay");

    if (!overlay || overlay.hidden) {
      return;
    }

    overlay.hidden = true;
    document.body.classList.remove("prayer-modal-open");

    if (prayerModalLastFocus && typeof prayerModalLastFocus.focus === "function") {
      prayerModalLastFocus.focus();
    }
  }

  function togglePrayerModalLayout() {
    const toggle = document.getElementById("prayerLayoutToggle");
    setPrayerModalLayout(toggle.getAttribute("aria-pressed") !== "true");
  }

  function bindEvents() {
    document.querySelectorAll("[data-prayer-toggle]").forEach((button) => {
      button.addEventListener("click", () => toggleSection(button.dataset.prayerToggle));
    });

    document.querySelectorAll("[data-random-play]").forEach((button) => {
      button.addEventListener("click", () => playRandomTrack(button.dataset.randomPlay));
    });

    document.querySelector(".prayer-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-track-play]");

      if (!button) {
        return;
      }

      playSelectedTrack(button.dataset.trackPlay, Number(button.dataset.trackIndex));
    });

    document.getElementById("audioDockClose").addEventListener("click", closeAudioDock);
    document.getElementById("prayerAudio").addEventListener("error", () => {
      setStatus("File nhạc không tồn tại hoặc không đọc được.", "error");
    });

    document.getElementById("openPrayerReadingModal").addEventListener("click", openPrayerReadingModal);
    document.getElementById("closePrayerReadingModal").addEventListener("click", closePrayerReadingModal);
    document.getElementById("prayerLayoutToggle").addEventListener("click", togglePrayerModalLayout);
    document.getElementById("prayerReadingModalOverlay").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        closePrayerReadingModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePrayerReadingModal();
      }
    });
  }

  async function initPrayerPage() {
    const user = await window.SionRouteGuard.requireAuth();

    if (!user) {
      return;
    }

    renderTrackLists();
    bindEvents();
    document.body.classList.add("is-ready");
  }

  document.addEventListener("DOMContentLoaded", initPrayerPage);
})();
