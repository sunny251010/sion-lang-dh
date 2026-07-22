(function () {
  const config = window.APP_CONFIG;

  function buildJsonpUrl(url, callbackName, parameterName) {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set(parameterName, callbackName);
    parsedUrl.searchParams.set("t", Date.now());
    return parsedUrl.toString();
  }

  function loadJsonp(url, parameterName) {
    return new Promise((resolve, reject) => {
      const callbackName = `__sionLangCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const script = document.createElement("script");
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error(`JSONP (${parameterName}) không phản hồi kịp thời.`));
      }, 15000);

      function cleanup() {
        window.clearTimeout(timeoutId);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete window[callbackName];
      }

      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error(`Không tải được JSONP với tham số ${parameterName}.`));
      };

      script.src = buildJsonpUrl(url, callbackName, parameterName);
      document.body.appendChild(script);
    });
  }

  function normalizeSongList(value) {
    const items = Array.isArray(value)
      ? value
      : String(value || "")
          .split(/[|,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean);

    return items
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  function sortServices(list) {
    return list.slice().sort((left, right) => {
      const leftRank = config.SERVICE_ORDER[left.id] ?? 99;
      const rightRank = config.SERVICE_ORDER[right.id] ?? 99;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return String(left.label).localeCompare(String(right.label), "vi");
    });
  }

  function normalizeService(rawService, index) {
    const service = rawService && typeof rawService === "object" ? rawService : {};
    const fallback = config.DEFAULT_SERVICES.find((item) => item.id === service.id) || config.DEFAULT_SERVICES[index] || {};
    const rawSongs = service.songs && service.songs.length ? service.songs : fallback.songs;

    return {
      id: String(service.id || fallback.id || `service-${index + 1}`),
      label: String(service.label || fallback.label || `Buổi ${index + 1}`),
      startTime: String(service.startTime || fallback.startTime || ""),
      tag: String(service.tag || fallback.tag || "Buổi Sabat"),
      openingText: String(service.openingText || fallback.openingText || ""),
      songs: normalizeSongList(rawSongs),
      summary: String(service.summary || fallback.summary || ""),
      sermonSite: String(service.sermonSite || fallback.sermonSite || ""),
      sermonYoutube: String(service.sermonYoutube || fallback.sermonYoutube || ""),
      sermonText: String(service.sermonText || fallback.sermonText || ""),
      rawContent: String(service.rawContent || fallback.rawContent || "")
    };
  }

  function normalizePayload(payload) {
    if (!payload || payload.success !== true) {
      throw new Error("API trả về success=false hoặc dữ liệu không hợp lệ.");
    }

    if (!Array.isArray(payload.services)) {
      throw new Error("API không có mảng services hợp lệ.");
    }

    const services = sortServices(payload.services.map((service, index) => normalizeService(service, index)));

    if (services.length === 0) {
      throw new Error("API không có buổi nào để hiển thị.");
    }

    return {
      updatedAt: String(payload.updatedAt || ""),
      services
    };
  }

  async function fetchRawPayload() {
    try {
      const response = await fetch(config.API_URL, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        payload: await response.json(),
        source: "fetch()"
      };
    } catch (fetchError) {
      const errors = [];

      for (const parameterName of ["callback", "prefix"]) {
        try {
          return {
            payload: await loadJsonp(config.API_URL, parameterName),
            source: `JSONP (${parameterName})`
          };
        } catch (jsonpError) {
          errors.push(jsonpError.message);
        }
      }

      throw new Error(`${fetchError.message}. ${errors.join(" | ")}`);
    }
  }

  async function loadServices() {
    const result = await fetchRawPayload();
    const normalized = normalizePayload(result.payload);

    return {
      services: normalized.services,
      updatedAt: normalized.updatedAt,
      source: result.source
    };
  }

  window.SionApi = {
    loadServices
  };
})();
