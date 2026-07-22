(function () {
  const STORAGE_KEY = "sion-lang-dh-lucky-wheel-names";
  const COLORS = ["#6f7f52", "#d6c29a", "#f0dfb6", "#9ea974", "#fff7df", "#c8a96a"];

  let names = [];
  let currentRotation = 0;
  let isSpinning = false;
  let winnerIndex = -1;

  function getElements() {
    return {
      nameInput: document.getElementById("nameInput"),
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

  function drawWheel() {
    const { canvas } = getElements();
    const context = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 18;

    context.clearRect(0, 0, size, size);

    if (names.length === 0) {
      context.fillStyle = "#fffdf7";
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(47, 51, 40, 0.14)";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#707567";
      context.font = "bold 30px Trebuchet MS";
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
      context.strokeStyle = "rgba(47, 51, 40, 0.16)";
      context.lineWidth = 2;
      context.stroke();

      context.save();
      context.translate(center, center);
      context.rotate(startAngle + arc / 2);
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.fillStyle = index % COLORS.length === 0 || index % COLORS.length === 3 ? "#fffdf7" : "#2f3328";
      context.font = "bold 24px Trebuchet MS";
      context.fillText(name.slice(0, 18), radius - 20, 0);
      context.restore();
    });

    context.beginPath();
    context.arc(center, center, 52, 0, Math.PI * 2);
    context.fillStyle = "#fffdf7";
    context.fill();
    context.strokeStyle = "rgba(47, 51, 40, 0.16)";
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
      return;
    }

    setStatus("Đã cập nhật danh sách.");
  }

  function spinWheel() {
    const { spinButton, removeWinnerButton, winnerText } = getElements();

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
    setStatus("Đã đặt lại vòng quay.");
  }

  function initLuckyWheel() {
    const { updateListButton, resetButton, spinButton, removeWinnerButton, nameInput } = getElements();

    names = loadNames();
    nameInput.value = names.join("\n");
    updateCountText();
    drawWheel();

    updateListButton.addEventListener("click", updateNamesFromInput);
    resetButton.addEventListener("click", resetWheel);
    spinButton.addEventListener("click", spinWheel);
    removeWinnerButton.addEventListener("click", removeWinner);
  }

  document.addEventListener("DOMContentLoaded", initLuckyWheel);
})();
