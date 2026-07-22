(function () {
  const SETTING_KEYS = [
    "siteName",
    "googleFormUrl",
    "sessionDurationHours",
    "loginBackground",
    "homeHeroImage",
    "allowRegister",
    "maintenanceMode",
    "apiVersion"
  ];

  function setStatus(message, tone = "info") {
    const status = document.getElementById("settingsStatus");
    status.textContent = message;
    status.classList.toggle("is-error", tone === "error");
  }

  function getInputType(key) {
    if (key === "allowRegister" || key === "maintenanceMode") {
      return "checkbox";
    }
    if (key === "sessionDurationHours") {
      return "number";
    }
    return "text";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function validateSetting(key, value) {
    if (key === "googleFormUrl" && value && !String(value).startsWith("https://docs.google.com/forms/")) {
      throw new Error("googleFormUrl phải bắt đầu bằng https://docs.google.com/forms/");
    }

    if (key === "sessionDurationHours") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue) || numberValue < 1 || numberValue > 168) {
        throw new Error("sessionDurationHours phải từ 1 đến 168.");
      }
    }
  }

  function renderSettings(settings) {
    const list = document.getElementById("settingsList");

    list.innerHTML = SETTING_KEYS.map((key) => {
      const type = getInputType(key);
      const value = settings[key];
      const checked = value === true ? "checked" : "";
      const valueAttribute = type === "checkbox" ? "" : `value="${escapeHtml(value)}"`;
      const minMax = key === "sessionDurationHours" ? 'min="1" max="168"' : "";

      return `
        <form class="setting-row" data-setting-key="${key}">
          <div>
            <strong>${key}</strong>
            <p class="muted">Cập nhật từng key.</p>
          </div>
          <input type="${type}" ${valueAttribute} ${checked} ${minMax} data-setting-input>
          <button class="button" type="submit">Lưu</button>
        </form>
      `;
    }).join("");

    list.querySelectorAll("[data-setting-key]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const key = form.dataset.settingKey;
        const input = form.querySelector("[data-setting-input]");
        const value = input.type === "checkbox" ? input.checked : input.value.trim();

        try {
          validateSetting(key, value);
          await window.SionApi.adminUpdateSetting(window.SionAuth.getToken(), key, key === "sessionDurationHours" ? Number(value) : value);
          setStatus(`Đã lưu ${key}.`);
        } catch (error) {
          setStatus(error.message || "Không lưu được cấu hình.", "error");
        }
      });
    });
  }

  async function initSettings() {
    const user = await window.SionRouteGuard.requireAdmin();
    if (!user) {
      return;
    }

    try {
      setStatus("Đang tải cấu hình...");
      const data = await window.SionApi.adminGetSettings(window.SionAuth.getToken());
      renderSettings(data.settings || {});
      setStatus("Đã tải cấu hình.");
    } catch (error) {
      setStatus("Không tải được cấu hình quản trị.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", initSettings);
})();
