(function () {
  function getBasePath() {
    return document.body.dataset.pathBase || ".";
  }

  function toLoginPath() {
    return `${getBasePath()}/login.html`;
  }

  function redirect(path) {
    window.location.replace(path);
  }

  async function requireAuth() {
    const token = window.SionAuth.getToken();
    const user = window.SionAuth.getUser();

    if (!token || !user || !window.SionAuth.isLoggedIn() || !window.SionAuth.isLocalSession()) {
      window.SionAuth.clearSession();
      redirect(toLoginPath());
      return null;
    }

    return user;
  }

  function redirectFromIndex() {
    if (!window.SionAuth.isLoggedIn()) {
      redirect("./login.html");
      return;
    }

    redirect("./home.html");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "index") {
      redirectFromIndex();
    }
  });

  window.SionRouteGuard = {
    requireAuth,
    redirectFromIndex
  };
})();
