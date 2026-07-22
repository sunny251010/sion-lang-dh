(function () {
  function getBasePath() {
    return document.body.dataset.pathBase || ".";
  }

  function getLoginPath() {
    return `${getBasePath()}/login.html`;
  }

  function getUserLabel(user) {
    if (!user) {
      return "";
    }

    return user.displayName || user.name || user.userId || user.id || "";
  }

  async function handleLogout() {
    await window.SionAuth.logout();
    window.location.href = getLoginPath();
  }

  function initNavigation() {
    const currentPage = document.body.dataset.page;
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navLinks = document.querySelector("[data-nav-links]");
    const adminLink = document.querySelector("[data-admin-link]");
    const userName = document.querySelector("[data-user-name]");
    const logoutButton = document.querySelector("[data-logout]");
    const user = window.SionAuth ? window.SionAuth.getUser() : null;

    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      if (link.dataset.navPage === currentPage) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });

    if (adminLink && (!user || user.role !== "admin")) {
      adminLink.hidden = true;
    }

    if (userName) {
      userName.textContent = getUserLabel(user);
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", handleLogout);
    }

    if (!navToggle || !navLinks) {
      return;
    }

    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initNavigation);
})();
