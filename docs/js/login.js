(function () {
  function isSafeRelativeImage(value) {
    return typeof value === "string" && value.startsWith("./assets/images/");
  }

  function setLoginError(message) {
    const loginError = document.getElementById("loginError");
    loginError.textContent = message;
    loginError.classList.toggle("visible", Boolean(message));
  }

  function setLoading(isLoading) {
    const loginButton = document.getElementById("loginButton");
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading ? "Đang đăng nhập..." : "Đăng nhập";
  }

  async function applyPublicSettings() {
    const loginPage = document.getElementById("loginPage");
    const siteName = document.getElementById("siteName");
    const maintenanceBox = document.getElementById("maintenanceBox");
    const loginForm = document.getElementById("loginForm");

    try {
      const data = await window.SionApi.getPublicSettings();
      const settings = data.settings || {};

      siteName.textContent = settings.siteName || window.APP_CONFIG.DEFAULT_SITE_NAME;

      if (isSafeRelativeImage(settings.loginBackground)) {
        loginPage.style.backgroundImage = `linear-gradient(rgba(12, 28, 70, 0.54), rgba(12, 28, 70, 0.54)), url("${settings.loginBackground}"), linear-gradient(135deg, #1c347d, #4967b7)`;
      }

      if (settings.maintenanceMode === true) {
        maintenanceBox.classList.add("visible");
        Array.from(loginForm.elements).forEach((element) => {
          element.disabled = true;
        });
      }
    } catch (error) {
      siteName.textContent = window.APP_CONFIG.DEFAULT_SITE_NAME;
    }
  }

  function redirectAfterLogin(user) {
    window.location.href = "./home.html";
  }

  function initLogin() {
    if (window.SionAuth.isLoggedIn() && window.SionAuth.isLocalSession()) {
      redirectAfterLogin(window.SionAuth.getUser());
      return;
    }

    if (window.SionAuth.isLoggedIn() && !window.SionAuth.isLocalSession()) {
      window.SionAuth.clearSession();
    }

    const loginForm = document.getElementById("loginForm");
    const password = document.getElementById("password");
    const togglePasswordButton = document.getElementById("togglePasswordButton");
    const rememberLogin = document.getElementById("rememberLogin");

    applyPublicSettings();

    togglePasswordButton.addEventListener("click", () => {
      const isHidden = password.type === "password";
      password.type = isHidden ? "text" : "password";
      togglePasswordButton.textContent = isHidden ? "Ẩn" : "Hiện";
    });

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setLoginError("");
      setLoading(true);

      const formData = new FormData(loginForm);
      const userId = String(formData.get("userId") || "").trim();
      const passwordValue = String(formData.get("password") || "");
      const shouldRemember = Boolean(rememberLogin && rememberLogin.checked);

      try {
        const result = window.SionAuth.loginLocal(userId, passwordValue);
        window.SionAuth.saveSession(result.token, result.user, result.expiresAt, shouldRemember);
        redirectAfterLogin(result.user);

        /*
          Google Sheet / Apps Script login cũ được giữ lại để sau này bật lại nếu cần:
          const result = await window.SionApi.login(userId, passwordValue);
          window.SionAuth.saveSession(result.token, result.user, result.expiresAt, shouldRemember);
          redirectAfterLogin(result.user);
        */
      } catch (error) {
        setLoginError("Không đăng nhập được. Vui lòng kiểm tra ID và mật khẩu.");
      } finally {
        setLoading(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initLogin);
})();
