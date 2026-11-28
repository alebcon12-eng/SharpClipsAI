(() => {
  const root = document.documentElement;
  if (root.dataset.welcome !== "open") return;

  const screen = document.getElementById("welcome-screen");
  if (location.hash || getComputedStyle(screen).display === "none") return;
  const slot = screen.querySelector(".welcome-language-slot");
  const language = document.getElementById("site-language").closest("label");
  const status = document.getElementById("language-status");
  const header = language.parentElement;
  const site = [...document.querySelectorAll("body > .skip-link, body > .site-header, body > main, body > .site-footer")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const options = { signal: events.signal };
  let exitFallback;

  slot.append(language, status);
  site.forEach(element => { element.inert = true; });
  root.dataset.welcomeBound = "";
  const copyFallback = setTimeout(() => { root.dataset.languageReady = ""; }, 300);
  document.addEventListener("site-language-change", () => clearTimeout(copyFallback), options);

  function revealSite() {
    events.abort();
    clearTimeout(copyFallback);
    clearTimeout(exitFallback);
    delete root.dataset.welcome;
    delete root.dataset.welcomeBound;
    header.append(language, status);
    site.forEach(element => { element.inert = false; });
    const heading = document.getElementById("hero-title");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  function enter(animate) {
    if (root.dataset.welcome !== "open") return;
    if (!animate || motion.matches) {
      revealSite();
      return;
    }
    root.dataset.welcome = "leaving";
    screen.addEventListener("animationend", event => {
      if (event.target === screen && event.animationName === "welcome-leave") revealSite();
    }, options);
    exitFallback = setTimeout(revealSite, 460);
  }

  screen.addEventListener("click", event => {
    const link = event.target.closest("[data-welcome-enter], [data-welcome-skip]");
    if (!link) return;
    event.preventDefault();
    enter(link.hasAttribute("data-welcome-enter"));
  }, options);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && event.target !== language.querySelector("select")) {
      event.preventDefault();
      enter(false);
    }
  }, options);
  window.addEventListener("hashchange", () => {
    if (location.hash) revealSite();
  }, options);
  window.addEventListener("pageshow", event => {
    if (event.persisted) revealSite();
  }, options);
})();
