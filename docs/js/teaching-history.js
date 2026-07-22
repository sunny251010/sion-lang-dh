(function () {
  const HISTORY_PREFIX = "mother-teaching-history:";
  const MAX_HISTORY_ITEMS = 30;

  function getUserKey(user) {
    const token = window.SionAuth ? window.SionAuth.getToken() : "";
    const identity = user && (
      user.id ||
      user.userId ||
      user.email ||
      user.username ||
      user.displayName ||
      user.name
    );

    return String(identity || token.slice(0, 16) || "current-session").trim();
  }

  function getStorageKey(user) {
    return `${HISTORY_PREFIX}${getUserKey(user)}`;
  }

  function load(user) {
    const key = getStorageKey(user);

    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      sessionStorage.removeItem(key);
      return [];
    }
  }

  function save(user, history) {
    const normalizedHistory = Array.isArray(history) ? history.slice(0, MAX_HISTORY_ITEMS) : [];

    try {
      sessionStorage.setItem(getStorageKey(user), JSON.stringify(normalizedHistory));
    } catch (error) {
      return load(user);
    }

    return normalizedHistory;
  }

  function add(user, item) {
    const nextHistory = [item, ...load(user)];
    return save(user, nextHistory);
  }

  function clear(user) {
    try {
      sessionStorage.removeItem(getStorageKey(user));
    } catch (error) {
      return;
    }
  }

  function clearAll() {
    const keysToRemove = [];

    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);

      if (key && key.startsWith(HISTORY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }

  window.SionTeachingHistory = {
    getStorageKey,
    load,
    save,
    add,
    clear,
    clearAll
  };
})();
