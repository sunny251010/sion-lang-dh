(function () {
  const config = window.APP_CONFIG;

  function saveSession(token, user, expiresAt) {
    localStorage.setItem(config.SESSION_TOKEN_KEY, token);
    localStorage.setItem(
      config.SESSION_USER_KEY,
      JSON.stringify(user || {})
    );

    if (expiresAt) {
      localStorage.setItem(
        config.SESSION_EXPIRES_KEY,
        String(expiresAt)
      );
    } else {
      localStorage.removeItem(config.SESSION_EXPIRES_KEY);
    }
  }

  function getToken() {
    return localStorage.getItem(config.SESSION_TOKEN_KEY) || "";
  }

  function getUser() {
    const rawUser = localStorage.getItem(
      config.SESSION_USER_KEY
    );

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function getExpiresAt() {
    return (
      localStorage.getItem(config.SESSION_EXPIRES_KEY) || ""
    );
  }

  function clearSession() {
    localStorage.removeItem(config.SESSION_TOKEN_KEY);
    localStorage.removeItem(config.SESSION_USER_KEY);
    localStorage.removeItem(config.SESSION_EXPIRES_KEY);
  }

  function isExpired() {
    const expiresAt = getExpiresAt();

    if (!expiresAt) {
      return false;
    }

    const timestamp = new Date(expiresAt).getTime();

    if (!Number.isFinite(timestamp)) {
      clearSession();
      return true;
    }

    return timestamp <= Date.now();
  }

  function isLoggedIn() {
    const token = getToken();

    if (!token) {
      return false;
    }

    if (isExpired()) {
      clearSession();
      return false;
    }

    return true;
  }

  function isAdmin() {
    const user = getUser();

    return Boolean(
      user &&
      String(user.role || "").toLowerCase() === "admin"
    );
  }

  async function logout() {
    const token = getToken();

    try {
      if (token && window.SionApi) {
        await window.SionApi.logout(token);
      }
    } catch (error) {
      console.warn(
        "Không thể đăng xuất khỏi server, vẫn xóa phiên local.",
        error
      );
    } finally {
      clearSession();
    }
  }

  window.SionAuth = {
    saveSession,
    getToken,
    getUser,
    getExpiresAt,
    clearSession,
    isExpired,
    isLoggedIn,
    isAdmin,
    logout
  };
})();