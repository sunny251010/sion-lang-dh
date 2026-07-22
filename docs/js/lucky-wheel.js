(function () {
  const STORAGE_KEY = "sion-lang-dh-lucky-wheel-names";
  const COLORS = ["#233f98", "#edf2ff", "#d2ad57", "#d8e1f3", "#173173", "#f1f4f9"];

  let names = [];
  let wheels = [];
  let currentRotation = 0;
  let isSpinning = false;
  let winnerIndex = -1;

  function getElements() {
    return {
      nameInput: document.getElementById("nameInput"),
      wheelSelect: document.getElementById("wheelSelect"),
      updateListButton: document.getElementById("updateListButton"),
      resetButton: document.getElementById("resetButton"),
      spinButton: document.getElementById("spinButton"),
      removeWinnerButton: document.getElementById("removeWinnerButton"),
      nameCountText: document.getElementById("nameCountText"),
      wheelStatus: document.getElementById("wheelStatus"),
      winnerText: document.getElementById("winnerText"),
      canvas: document.getElementById("wheelCanvas")
    };
  }

  function parseNames(value) {
    const seen = new Set();

    return String(value || "")
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLocaleLowerCase("vi");
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  function saveNames() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  }

  function loadNames() {
    try {
      const savedNames = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(savedNames) ? savedNames.filter((name) => typeof name === "string" && name.trim()) : [];
    } catch (error) {
      return [];
    }
  }

  function setStatus(message, tone = "info") {
    const { wheelStatus } = getElements();
    wheelStatus.textContent = message;
    wheelStatus.classList.toggle("is-error", tone === "error");
  }

  function updateCountText() {
    const { nameCountText } = getElements();
    nameCountText.textContent = `${names.length} người trong danh sách.`;
  }

  function setSpinEnabled(isEnabled) {
    const { spinButton } = getElements();
    spinButton.disabled = !isEnabled;
  }

  function populateWheelSelect() {
    const { wheelSelect } = getElements();

    wheelSelect.innerHTML = wheels
      .map((wheel, index) => `<option value="${index}">${wheel.title || `Vòng quay ${index + 1}`}</option>`)
      .join("");

    wheelSelect.disabled = wheels.length <= 1;
  }

  function applyWheel(index) {
    const wheel = wheels[index];
    winnerIndex = -1;
    currentRotation = 0;

    if (!wheel) {
      names = [];
      syncListToUi();
      setSpinEnabled(false);
      setStatus("Chưa có vòng quay nào từ API.", "error");
      return;
    }

    names = Array.isArray(wheel.participants)
      ? wheel.participants.map((name) => String(name).trim()).filter(Boolean)
      : [];

    syncListToUi();
    setSpinEnabled(names.length > 0);
    setStatus(names.length > 0 ? `Đã tải ${wheel.title || "vòng quay"}.` : "Vòng quay này chưa có người tham gia.", names.length > 0 ? "info" : "error");
  }

  async function loadWheelsFromApi() {
    const { wheelSelect } = getElements();

    try {
      const data = await window.SionApi.getWheels();
      wheels = Array.isArray(data.wheels) ? data.wheels : [];
      populateWheelSelect();

      if (wheels.length === 0) {
        applyWheel(-1);
        return;
      }

      wheelSelect.value = "0";
      applyWheel(0);
    } catch (error) {
      const localNames = loadNames();
      wheels = localNames.length > 0
        ? [{ wheelId: "local-fallback", title: "Dữ liệu cục bộ", participants: localNames }]
        : [];
      populateWheelSelect();

      if (wheels.length === 0) {
        applyWheel(-1);
        setStatus("Không tải được danh sách vòng quay và chưa có dữ liệu cục bộ.", "error");
        return;
      }

      applyWheel(0);
      setStatus("Không tải được API vòng quay. Đang dùng dữ liệu cục bộ trong trình duyệt.", "error");
    }
  }

  function drawWheel() {
    const { canvas } = getElements();
    const context = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 18;

    context.clearRect(0, 0, size, size);

    if (names.length === 0) {
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(31, 49, 91, 0.18)";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#667085";
      context.font = "bold 30px Segoe UI";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("Nhập danh sách", center, center);
      return;
    }

    const arc = (Math.PI * 2) / names.length;

    names.forEach((name, index) => {
      const startAngle = -Math.PI / 2 + index * arc + currentRotation;
      const endAngle = startAngle + arc;

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
      context.fillStyle = index % COLORS.length === 0 || index % COLORS.length === 4 ? "#ffffff" : "#20283a";
      context.font = "bold 24px Segoe UI";
      context.fillText(name.slice(0, 18), radius - 20, 0);
      context.restore();
    });

    context.beginPath();
    context.arc(center, center, 52, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "rgba(31, 49, 91, 0.16)";
    context.lineWidth = 2;
    context.stroke();
  }

  function syncListToUi() {
    const { nameInput, removeWinnerButton, winnerText } = getElements();
    nameInput.value = names.join("\n");
    updateCountText();
    drawWheel();

    if (winnerIndex < 0 || !names[winnerIndex]) {
      removeWinnerButton.disabled = true;
      winnerText.textContent = "Chưa quay";
    }
  }

  function updateNamesFromInput() {
    const { nameInput } = getElements();
    names = parseNames(nameInput.value);
    winnerIndex = -1;
    saveNames();
    syncListToUi();

    if (names.length === 0) {
      setStatus("Danh sách đang trống. Hãy nhập ít nhất một tên hợp lệ.", "error");
      setSpinEnabled(false);
      return;
    }

    setSpinEnabled(true);
    setStatus("Đã cập nhật danh sách.");
  }

  function spinWheel() {
    const { spinButton, removeWinnerButton, winnerText } = getElements();
    const resultBox = document.getElementById("resultBox");

    if (isSpinning) {
      return;
    }

    if (names.length === 0) {
      setStatus("Không thể quay khi danh sách trống.", "error");
      return;
    }

    winnerIndex = Math.floor(Math.random() * names.length);
    const arc = (Math.PI * 2) / names.length;
    const winnerMidAngle = -Math.PI / 2 + winnerIndex * arc + arc / 2;
    let targetRotation = -Math.PI / 2 - winnerMidAngle;

    while (targetRotation < currentRotation + Math.PI * 8) {
      targetRotation += Math.PI * 2;
    }

    const startRotation = currentRotation;
    const rotationDelta = targetRotation - startRotation;
    const duration = 3800;
    const startedAt = performance.now();

    isSpinning = true;
    spinButton.disabled = true;
    removeWinnerButton.disabled = true;
    winnerText.textContent = "Đang quay...";
    setStatus("Đang quay...");

    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      currentRotation = startRotation + rotationDelta * eased;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
        return;
      }

      currentRotation = targetRotation % (Math.PI * 2);
      isSpinning = false;
      spinButton.disabled = false;
      removeWinnerButton.disabled = false;
      winnerText.textContent = names[winnerIndex];
      if (resultBox) {
        resultBox.classList.remove("is-highlight");
        window.requestAnimationFrame(() => resultBox.classList.add("is-highlight"));
      }
      setStatus(`Kết quả: ${names[winnerIndex]}.`);
    }

    requestAnimationFrame(animate);
  }

  function removeWinner() {
    const { removeWinnerButton } = getElements();

    if (winnerIndex < 0 || !names[winnerIndex]) {
      return;
    }

    const removedName = names[winnerIndex];
    names.splice(winnerIndex, 1);
    winnerIndex = -1;
    saveNames();
    removeWinnerButton.disabled = true;
    syncListToUi();
    setStatus(`Đã xóa ${removedName} khỏi danh sách.`);
  }

  function resetWheel() {
    const { nameInput, removeWinnerButton, winnerText } = getElements();
    names = [];
    currentRotation = 0;
    winnerIndex = -1;
    localStorage.removeItem(STORAGE_KEY);
    nameInput.value = "";
    removeWinnerButton.disabled = true;
    winnerText.textContent = "Chưa quay";
    updateCountText();
    drawWheel();
    setSpinEnabled(false);
    setStatus("Đã đặt lại vòng quay.");
  }

  function initLuckyWheel() {
    const { updateListButton, resetButton, spinButton, removeWinnerButton, nameInput, wheelSelect } = getElements();

    window.SionRouteGuard.requireAuth().then((user) => {
      if (!user) {
        return;
      }

      loadWheelsFromApi();
    });

    names = [];
    nameInput.value = "";
    updateCountText();
    drawWheel();
    setSpinEnabled(false);

    updateListButton.addEventListener("click", updateNamesFromInput);
    resetButton.addEventListener("click", resetWheel);
    spinButton.addEventListener("click", spinWheel);
    removeWinnerButton.addEventListener("click", removeWinner);
    wheelSelect.addEventListener("change", () => applyWheel(Number(wheelSelect.value)));
  }

  document.addEventListener("DOMContentLoaded", initLuckyWheel);
})();
