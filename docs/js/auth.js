(function () {
  const config = window.APP_CONFIG;
  const sessionStorageRef = window.sessionStorage;
  const persistentStorage = window.localStorage;

  function writeSession(storage, token, user, expiresAt) {
    storage.setItem(config.SESSION_TOKEN_KEY, token);
    storage.setItem(
      config.SESSION_USER_KEY,
      JSON.stringify(user || {})
    );

    if (expiresAt) {
      storage.setItem(
        config.SESSION_EXPIRES_KEY,
        String(expiresAt)
      );
    } else {
      storage.removeItem(config.SESSION_EXPIRES_KEY);
    }
  }

  function clearStorage(storage) {
    storage.removeItem(config.SESSION_TOKEN_KEY);
    storage.removeItem(config.SESSION_USER_KEY);
    storage.removeItem(config.SESSION_EXPIRES_KEY);
  }

  function hasPersistentSession() {
    return Boolean(persistentStorage.getItem(config.SESSION_TOKEN_KEY));
  }

  function getActiveStorage() {
    return sessionStorageRef.getItem(config.SESSION_TOKEN_KEY)
      ? sessionStorageRef
      : persistentStorage;
  }

  function saveSession(token, user, expiresAt, remember = false) {
    writeSession(sessionStorageRef, token, user, expiresAt);

    if (remember) {
      writeSession(persistentStorage, token, user, expiresAt);
      return;
    }

    clearStorage(persistentStorage);
  }

  function createLocalToken(userId) {
    const randomPart = window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `local:${userId}:${randomPart}`;
  }

  function loginLocal(userId, password) {
    const normalizedUserId = String(userId || "").trim().toLowerCase();
    const passwordValue = String(password || "");
    const users = Array.isArray(config.LOCAL_AUTH_USERS) ? config.LOCAL_AUTH_USERS : [];
    const matchedUser = users.find((user) => (
      String(user.id || "").toLowerCase() === normalizedUserId &&
      String(user.password || "") === passwordValue
    ));

    if (!matchedUser) {
      throw new Error("Sai ID hoặc mật khẩu.");
    }

    const { password: ignoredPassword, ...safeUser } = matchedUser;

    return {
      token: createLocalToken(safeUser.id),
      user: {
        ...safeUser,
        authProvider: "local"
      },
      expiresAt: ""
    };
  }

  function getToken() {
    return getActiveStorage().getItem(config.SESSION_TOKEN_KEY) || "";
  }

  function isLocalToken(token) {
    return String(token || "").startsWith("local:");
  }

  function getUser() {
    const rawUser = getActiveStorage().getItem(
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
      getActiveStorage().getItem(config.SESSION_EXPIRES_KEY) || ""
    );
  }

  function clearSession() {
    clearStorage(sessionStorageRef);
    clearStorage(persistentStorage);
    persistentStorage.removeItem("sion-lang-dh-lucky-wheel-names");

    if (window.SionTeachingHistory) {
      window.SionTeachingHistory.clearAll();
    } else {
      const historyKeys = [];

      for (let index = 0; index < sessionStorage.length; index += 1) {
        const key = sessionStorage.key(index);

        if (key && key.startsWith("mother-teaching-history:")) {
          historyKeys.push(key);
        }
      }

      historyKeys.forEach((key) => sessionStorage.removeItem(key));
    }
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

  function isLocalSession() {
    const user = getUser();

    return Boolean(
      isLocalToken(getToken()) &&
      user &&
      user.authProvider === "local"
    );
  }

  async function logout() {
    const token = getToken();

    try {
      if (token && window.SionApi && !isLocalToken(token)) {
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
    loginLocal,
    saveSession,
    getToken,
    getUser,
    getExpiresAt,
    hasPersistentSession,
    clearSession,
    isExpired,
    isLoggedIn,
    isLocalSession,
    logout
  };
})();
