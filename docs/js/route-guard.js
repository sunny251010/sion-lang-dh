(function () {
  function getBasePath() {
    return document.body.dataset.pathBase || ".";
  }

  function toLoginPath() {
    return `${getBasePath()}/login.html`;
  }

  function toHomePath() {
    return `${getBasePath()}/home.html`;
  }

  function toAdminPath() {
    return `${getBasePath()}/admin/index.html`;
  }

  function redirect(path) {
    window.location.replace(path);
  }

  function normalizeUserResponse(data) {
    return data.user || data.currentUser || data;
  }

  async function requireAuth() {
    const token = window.SionAuth.getToken();

    if (!token || !window.SionAuth.isLoggedIn()) {
      window.SionAuth.clearSession();
      redirect(toLoginPath());
      return null;
    }

    try {
      const data = await window.SionApi.getCurrentUser(token);
      const user = normalizeUserResponse(data);
      window.SionAuth.saveSession(token, user, data.expiresAt);
      return user;
    } catch (error) {
      window.SionAuth.clearSession();
      redirect(toLoginPath());
      return null;
    }
  }

  async function requireAdmin() {
    const user = await requireAuth();
    if (!user) {
      return null;
    }

    if (user.role !== "admin") {
      redirect(toHomePath());
      return null;
    }

    return user;
  }

  function redirectFromIndex() {
    if (!window.SionAuth.isLoggedIn()) {
      redirect("./login.html");
      return;
    }

    const user = window.SionAuth.getUser();
    redirect(user && user.role === "admin" ? "./admin/index.html" : "./home.html");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "index") {
      redirectFromIndex();
    }
  });

  window.SionRouteGuard = {
    requireAuth,
    requireAdmin,
    redirectFromIndex
  };
})();
