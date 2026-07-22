(function () {
  function isSafeRelativeImage(value) {
    return typeof value === "string" && value.startsWith("./assets/images/");
  }

  function applySiteName(siteName) {
    document.querySelectorAll("[data-site-name]").forEach((element) => {
      element.textContent = siteName || window.APP_CONFIG.DEFAULT_SITE_NAME;
    });
  }

  async function applyPublicSettings() {
    const hero = document.getElementById("homeHero");
    const maintenanceNotice = document.getElementById("homeMaintenanceNotice");
    applySiteName(window.APP_CONFIG.DEFAULT_SITE_NAME);

    try {
      const data = await window.SionApi.getPublicSettings();
      const settings = data.settings || {};
      applySiteName(window.APP_CONFIG.DEFAULT_SITE_NAME);

      if (hero && isSafeRelativeImage(settings.homeHeroImage)) {
        hero.style.backgroundImage = `linear-gradient(rgba(12, 28, 70, 0.54), rgba(12, 28, 70, 0.54)), url("${settings.homeHeroImage}"), linear-gradient(135deg, #1c347d, #4967b7)`;
      }

      if (maintenanceNotice) {
        maintenanceNotice.hidden = settings.maintenanceMode !== true;
      }
    } catch (error) {
      applySiteName(window.APP_CONFIG.DEFAULT_SITE_NAME);
    }
  }

  async function initHome() {
    const user = await window.SionRouteGuard.requireAuth();
    if (!user) {
      return;
    }

    await applyPublicSettings();
    document.body.classList.add("is-ready");
  }

  document.addEventListener("DOMContentLoaded", initHome);
})();
