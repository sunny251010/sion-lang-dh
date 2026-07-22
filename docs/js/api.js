(function () {
  const config = window.APP_CONFIG;
  const TIMEOUT_MS = 15000;

  function buildUrl(action) {
    const url = new URL(config.API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("t", Date.now());
    return url.toString();
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error("API không trả về JSON hợp lệ.");
      }

      if (!data || data.success === false) {
        throw new Error(data && (data.error || data.message) ? data.error || data.message : "API trả về lỗi.");
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("API phản hồi quá lâu. Vui lòng thử lại.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function postJson(payload) {
    return requestJson(config.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
  }

  function getProgram() {
    return requestJson(buildUrl("program"));
  }

  function getPublicSettings() {
    return requestJson(buildUrl("publicSettings"));
  }

  function getWheels() {
    return requestJson(buildUrl("wheels"));
  }

  function login(userId, password) {
    return postJson({
      action: "login",
      userId,
      password
    });
  }

  function logout(token) {
    return postJson({
      action: "logout",
      token
    });
  }

  function getCurrentUser(token) {
    return postJson({
      action: "me",
      token
    });
  }

  function adminGetSettings(token) {
    return postJson({
      action: "admin.getSettings",
      token
    });
  }

  function adminUpdateSetting(token, key, value) {
    return postJson({
      action: "admin.updateSetting",
      token,
      key,
      value
    });
  }

  function adminCreateWheel(token, wheelData) {
    return postJson({
      action: "admin.createWheel",
      token,
      wheel: wheelData
    });
  }

  function adminUpdateWheel(token, wheelData) {
    return postJson({
      action: "admin.updateWheel",
      token,
      wheel: wheelData
    });
  }

  function adminDeleteWheel(token, wheelId) {
    return postJson({
      action: "admin.deleteWheel",
      token,
      wheelId
    });
  }

  window.SionApi = {
    requestJson,
    getProgram,
    getPublicSettings,
    getWheels,
    login,
    logout,
    getCurrentUser,
    adminGetSettings,
    adminUpdateSetting,
    adminCreateWheel,
    adminUpdateWheel,
    adminDeleteWheel
  };
})();
