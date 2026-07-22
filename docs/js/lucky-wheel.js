(function () {
  const COLORS = [
    "#173173",
    "#edf2ff",
    "#d2ad57",
    "#f7efe0",
    "#233f98",
    "#ffffff"
  ];

  let teachings = [];
  let currentUser = null;
  let currentRotation = 0;
  let isDrawing = false;
  let lastFocusedElement = null;

  function getElements() {
    return {
      canvas: document.getElementById("teachingCanvas"),
      drawButton: document.getElementById("drawButton"),
      drawStatus: document.getElementById("drawStatus"),
      latestResultText: document.getElementById("latestResultText"),
      resultBox: document.getElementById("resultBox"),
      historyList: document.getElementById("historyList"),
      modalOverlay: document.getElementById("teachingModalOverlay"),
      modal: document.getElementById("teachingModal"),
      modalTeachingNumber: document.getElementById("modalTeachingNumber"),
      modalTeachingContent: document.getElementById("modalTeachingContent"),
      modalCloseIcon: document.getElementById("modalCloseIcon"),
      modalCloseButton: document.getElementById("modalCloseButton"),
      openTeachingListButton: document.getElementById("openTeachingListButton"),
      listModalOverlay: document.getElementById("teachingListModalOverlay"),
      listModal: document.getElementById("teachingListModal"),
      listContent: document.getElementById("teachingListContent"),
      listModalCloseIcon: document.getElementById("teachingListModalCloseIcon"),
      listModalCloseButton: document.getElementById("teachingListModalCloseButton")
    };
  }

  function setStatus(message, tone = "info") {
    const { drawStatus } = getElements();
    drawStatus.textContent = message;
    drawStatus.classList.toggle("is-error", tone === "error");
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function getRandomIndex(length) {
    if (length <= 0) {
      return -1;
    }

    if (window.crypto && window.crypto.getRandomValues) {
      const maxUint32 = 0xffffffff;
      const limit = Math.floor((maxUint32 + 1) / length) * length;
      const randomValues = new Uint32Array(1);

      do {
        window.crypto.getRandomValues(randomValues);
      } while (randomValues[0] >= limit);

      return randomValues[0] % length;
    }

    return Math.floor(Math.random() * length);
  }

  function normalizeTeachings() {
    return Array.isArray(window.MOTHER_TEACHINGS)
      ? window.MOTHER_TEACHINGS
        .filter((teaching) => teaching && Number.isInteger(teaching.number) && teaching.content)
        .slice(0, 13)
      : [];
  }

  function applyBackgroundFromConfig() {
    const imagePath = window.APP_CONFIG && window.APP_CONFIG.TEACHING_DRAW_BACKGROUND;

    if (imagePath) {
      document.body.style.setProperty("--teaching-background-image", `url("${imagePath}")`);
    }
  }

  function drawWheel() {
    const { canvas } = getElements();
    const context = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 18;

    context.clearRect(0, 0, size, size);

    if (teachings.length === 0) {
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = "rgba(31, 49, 91, 0.18)";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#667085";
      context.font = "bold 30px Segoe UI";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("Chưa có dữ liệu", center, center);
      return;
    }

    const arc = (Math.PI * 2) / teachings.length;

    teachings.forEach((teaching, index) => {
      const startAngle = -Math.PI / 2 + index * arc + currentRotation;
      const endAngle = startAngle + arc;
      const isDarkSegment = index % COLORS.length === 0 || index % COLORS.length === 4;

      context.beginPath();
      context.moveTo(center, center);
      context.arc(center, center, radius, startAngle, endAngle);
      context.closePath();
      context.fillStyle = COLORS[index % COLORS.length];
      context.fill();
      context.strokeStyle = "rgba(31, 49, 91, 0.16)";
      context.lineWidth = 2;
      context.stroke();

      context.save();
      context.translate(center, center);
      context.rotate(startAngle + arc / 2);
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.fillStyle = isDarkSegment ? "#ffffff" : "#173173";
      context.font = "900 42px Segoe UI";
      context.fillText(String(teaching.number), radius - 42, 0);
      context.restore();
    });

    context.beginPath();
    context.arc(center, center, 58, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "rgba(31, 49, 91, 0.18)";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#d2ad57";
    context.font = "900 28px Segoe UI";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("13", center, center - 4);
  }

  function renderHistory() {
    const { historyList } = getElements();
    const history = window.SionTeachingHistory.load(currentUser);

    if (history.length === 0) {
      historyList.innerHTML = '<p class="history-empty">Chưa có lượt bốc thăm nào trong phiên này.</p>';
      return;
    }

    historyList.innerHTML = history
      .map((item) => {
        const number = escapeHtml(item.teachingNumber);
        const time = escapeHtml(formatTime(item.createdAt));
        return `
          <article class="history-item">
            <span class="history-number">Giáo huấn số ${number}</span>
            <span class="history-time">${time}</span>
          </article>
        `;
      })
      .join("");
  }

  function createHistoryItem(teaching) {
    const idSource = window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return {
      id: idSource,
      teachingNumber: teaching.number,
      createdAt: new Date().toISOString()
    };
  }

  function setDrawButtonLoading(isLoading) {
    const { drawButton } = getElements();
    drawButton.disabled = isLoading || teachings.length === 0;
    drawButton.textContent = isLoading ? "Đang bốc thăm..." : "Bốc thăm";
  }

  function openModal(teaching) {
    const {
      modalOverlay,
      modal,
      modalTeachingNumber,
      modalTeachingContent
    } = getElements();

    lastFocusedElement = document.activeElement;
    modalTeachingNumber.textContent = String(teaching.number);
    modalTeachingContent.textContent = teaching.content;
    modalOverlay.hidden = false;
    document.body.classList.add("modal-open");
    modal.focus();
  }

  function closeModal() {
    const { modalOverlay } = getElements();
    modalOverlay.hidden = true;
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function renderTeachingList() {
    const { listContent } = getElements();
    listContent.innerHTML = teachings
      .map((teaching) => `
        <article class="teaching-list-item">
          <h3>Giáo huấn số ${escapeHtml(teaching.number)}</h3>
          <p>${escapeHtml(teaching.content)}</p>
        </article>
      `)
      .join("");
  }

  function openTeachingListModal() {
    const { listModalOverlay, listModal } = getElements();
    lastFocusedElement = document.activeElement;
    renderTeachingList();
    listModalOverlay.hidden = false;
    document.body.classList.add("modal-open");
    listModal.focus();
  }

  function closeTeachingListModal() {
    const { listModalOverlay } = getElements();
    listModalOverlay.hidden = true;
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function finishDraw(teaching, targetRotation) {
    const { latestResultText, resultBox } = getElements();
    currentRotation = targetRotation % (Math.PI * 2);
    isDrawing = false;
    latestResultText.textContent = `Giáo huấn số ${teaching.number}`;
    window.SionTeachingHistory.add(currentUser, createHistoryItem(teaching));
    renderHistory();

    if (resultBox) {
      resultBox.classList.remove("is-highlight");
      window.requestAnimationFrame(() => resultBox.classList.add("is-highlight"));
    }

    setDrawButtonLoading(false);
    setStatus(`Bạn đã bốc được Giáo huấn số ${teaching.number}.`);
    openModal(teaching);
  }

  function startTeachingDraw() {
    if (isDrawing) {
      return;
    }

    if (!window.SionAuth.isLoggedIn()) {
      setStatus("Vui lòng đăng nhập lại trước khi bốc thăm.", "error");
      return;
    }

    if (teachings.length !== 13) {
      setStatus("Dữ liệu Giáo huấn chưa sẵn sàng.", "error");
      return;
    }

    const selectedIndex = getRandomIndex(teachings.length);
    const selectedTeaching = teachings[selectedIndex];
    const arc = (Math.PI * 2) / teachings.length;
    const selectedMidAngle = -Math.PI / 2 + selectedIndex * arc + arc / 2;
    let targetRotation = -Math.PI / 2 - selectedMidAngle;

    while (targetRotation < currentRotation + Math.PI * 8) {
      targetRotation += Math.PI * 2;
    }

    isDrawing = true;
    setDrawButtonLoading(true);
    setStatus("Đang bốc thăm...");

    if (prefersReducedMotion()) {
      currentRotation = targetRotation;
      drawWheel();
      finishDraw(selectedTeaching, targetRotation);
      return;
    }

    const startRotation = currentRotation;
    const rotationDelta = targetRotation - startRotation;
    const duration = 3600;
    const startedAt = performance.now();

    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      currentRotation = startRotation + rotationDelta * eased;
      drawWheel();

      if (progress < 1) {
        window.requestAnimationFrame(animate);
        return;
      }

      finishDraw(selectedTeaching, targetRotation);
    }

    window.requestAnimationFrame(animate);
  }

  function bindModalEvents() {
    const {
      modalOverlay,
      modalCloseIcon,
      modalCloseButton,
      openTeachingListButton,
      listModalOverlay,
      listModalCloseIcon,
      listModalCloseButton
    } = getElements();

    modalCloseIcon.addEventListener("click", closeModal);
    modalCloseButton.addEventListener("click", closeModal);
    openTeachingListButton.addEventListener("click", openTeachingListModal);
    listModalCloseIcon.addEventListener("click", closeTeachingListModal);
    listModalCloseButton.addEventListener("click", closeTeachingListModal);

    modalOverlay.addEventListener("click", (event) => {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });

    listModalOverlay.addEventListener("click", (event) => {
      if (event.target === listModalOverlay) {
        closeTeachingListModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modalOverlay.hidden) {
        closeModal();
      }

      if (event.key === "Escape" && !listModalOverlay.hidden) {
        closeTeachingListModal();
      }
    });
  }

  function initUi() {
    const { drawButton } = getElements();
    teachings = normalizeTeachings();
    applyBackgroundFromConfig();
    drawWheel();
    renderHistory();
    setDrawButtonLoading(false);

    if (teachings.length !== 13) {
      setStatus("Cần đủ 13 Giáo huấn trước khi sử dụng.", "error");
      drawButton.disabled = true;
      return;
    }

    drawButton.addEventListener("click", startTeachingDraw);
    bindModalEvents();
  }

  function redirectToLogin() {
    window.location.replace("./login.html");
  }

  function initTeachingDraw() {
    localStorage.removeItem("sion-lang-dh-lucky-wheel-names");

    if (!window.SionAuth.isLoggedIn() || !window.SionAuth.isLocalSession()) {
      window.SionAuth.clearSession();
      redirectToLogin();
      return;
    }

    currentUser = window.SionAuth.getUser() || {};
    initUi();
  }

  document.addEventListener("DOMContentLoaded", initTeachingDraw);
})();
