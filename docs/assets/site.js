const navigation = document.querySelector(".navigation");
const menuToggle = navigation.querySelector(".menu-toggle");
const menu = document.getElementById("menu");
const mobileLayout = window.matchMedia("(max-width: 820px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setMenuOpen(open) {
  menuToggle.setAttribute("aria-expanded", String(open));
  menu.hidden = mobileLayout.matches && !open;
}

function updateNavigation() {
  const focusOnMenuLink = menu.contains(document.activeElement);
  const focusOnButton = document.activeElement === menuToggle;
  menuToggle.hidden = !mobileLayout.matches;
  setMenuOpen(false);

  if (mobileLayout.matches && focusOnMenuLink) {
    menuToggle.focus();
  } else if (!mobileLayout.matches && focusOnButton) {
    menu.querySelector("a").focus();
  }
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") === "false");
});

menu.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!mobileLayout.matches || !link || event.defaultPrevented ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  const heading = document.querySelector(link.hash)?.querySelector("h2, h3");
  setMenuOpen(false);
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!navigation.contains(event.target) && menuToggle.getAttribute("aria-expanded") === "true") {
    if (menu.contains(document.activeElement)) {
      menuToggle.focus();
    }
    setMenuOpen(false);
  }
});

mobileLayout.addEventListener("change", updateNavigation);
updateNavigation();

const navSections = [...menu.querySelectorAll("a")].map(link => ({
  link,
  target: document.getElementById(link.hash.slice(1)),
}));
const header = navigation.closest(".site-header");
let activeSection;
let navFrame;

function updateActiveSection() {
  navFrame = null;
  const line = header.offsetHeight + Math.min(window.innerHeight * .2, 145);
  const section = navSections.findLast(({ target }) => target.getBoundingClientRect().top <= line);
  if (section === activeSection) return;

  activeSection?.link.removeAttribute("aria-current");
  section?.link.setAttribute("aria-current", "location");
  activeSection = section;
}

function requestNavUpdate() {
  navFrame ??= requestAnimationFrame(updateActiveSection);
}

window.addEventListener("scroll", requestNavUpdate, { passive: true });
window.addEventListener("resize", requestNavUpdate);
requestNavUpdate();

const captionPlayers = new Map();
for (const button of document.querySelectorAll(".caption-play")) {
  const player = document.getElementById(button.getAttribute("aria-controls"));
  const styleName = document.getElementById(player.getAttribute("aria-labelledby")).textContent;

  function updatePlayButton() {
    const label = !player.paused ? "Pausar" : player.currentTime > 0 && !player.ended ? "Continuar" : "Repetir";
    button.textContent = label;
    button.setAttribute("aria-label", label + " animação de " + styleName);
  }

  player.controls = false;
  player.addEventListener("play", updatePlayButton);
  player.addEventListener("pause", updatePlayButton);
  player.addEventListener("ended", () => {
    player.load();
    updatePlayButton();
  });

  async function startPreview(restart = false) {
    button.hidden = player.controls;
    if (restart && player.readyState >= HTMLMediaElement.HAVE_METADATA) {
      player.currentTime = 0;
    }
    try {
      await player.play();
    } catch (error) {
      if (error.name === "AbortError") return;
      player.controls = true;
      button.hidden = true;
    }
  }
  button.addEventListener("click", () => {
    if (player.paused) {
      startPreview();
    } else {
      player.pause();
    }
  });
  captionPlayers.set(player, startPreview);
}

function connectTabs(list, onSelect) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls")));
  let activeIndex = 0;

  function select(index, activated = false) {
    const previous = panels[activeIndex];
    activeIndex = index;
    tabs.forEach((tab, position) => {
      const selected = position === activeIndex;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    onSelect({ panel: panels[index], previous, index, activated });
    return panels[index];
  }

  tabs.forEach((tab, index) => {
    panels[index].setAttribute("role", "tabpanel");
    panels[index].setAttribute("aria-labelledby", tab.id);
    tab.addEventListener("click", () => select(index, true));
  });

  const keyOffsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 };
  list.addEventListener("keydown", event => {
    let index;
    if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else if (Object.hasOwn(keyOffsets, event.key)) {
      index = (activeIndex + keyOffsets[event.key] + tabs.length) % tabs.length;
    } else return;

    event.preventDefault();
    select(index, true);
    tabs[index].focus();
  });

  select(0);
  return select;
}

const picker = document.querySelector(".caption-picker");
if (picker) {
  const list = picker.querySelector(".style-tabs");
  connectTabs(list, ({ panel, previous, activated }) => {
    if (previous !== panel) previous.querySelector("video").pause();
    if (activated) captionPlayers.get(panel.querySelector("video"))(true);
  });

  function updateTabOrientation() {
    list.setAttribute("aria-orientation", mobileLayout.matches ? "horizontal" : "vertical");
  }

  updateTabOrientation();
  mobileLayout.addEventListener("change", updateTabOrientation);
  picker.hidden = false;
  picker.closest(".caption-lab").dataset.ready = "true";
}

const tutorial = document.querySelector(".tutorial");
if (tutorial) {
  const list = tutorial.querySelector(".tutorial-tabs");
  const actions = tutorial.querySelector(".tutorial-navigation");
  const previousButton = actions.querySelector(".tutorial-previous");
  const nextButton = actions.querySelector(".tutorial-next");
  const progress = actions.querySelector(".tutorial-progress");
  let current = 0;
  const step = connectTabs(list, ({ panel, index }) => {
    if (index !== current) panel.style.setProperty("--panel-offset", index < current ? "-.85rem" : ".85rem");
    current = index;
    progress.value = index + 1;
    actions.style.setProperty("--tutorial-completion", progress.position);
    previousButton.disabled = index === 0;
    nextButton.textContent = index === progress.max - 1 ? "Recomeçar" : "Próxima etapa";
  });

  function goTo(index) {
    const heading = step(index).querySelector("h3");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "nearest" });
  }

  previousButton.addEventListener("click", () => goTo(current - 1));
  nextButton.addEventListener("click", () => goTo((current + 1) % progress.max));
  list.hidden = false;
  actions.hidden = false;
  tutorial.dataset.ready = "true";
}

const exampleLanguage = document.getElementById("example-language");
if (exampleLanguage) {
  const exampleResult = document.getElementById("translation-result");
  const exampleLabel = document.getElementById("translation-result-label");
  const exampleFlag = document.getElementById("translation-flag");
  const output = exampleResult.closest(".translation-output") || exampleResult;
  exampleLanguage.addEventListener("change", () => {
    const option = exampleLanguage.selectedOptions[0];
    exampleLabel.textContent = "Tradução em " + option.textContent.toLocaleLowerCase("pt-BR");
    exampleResult.lang = option.value;
    exampleResult.textContent = option.dataset.example;
    exampleFlag?.setAttribute("href", "#flag-" + option.value.split("-")[0]);
    if (!reducedMotion.matches && output.animate) {
      output.getAnimations().forEach(animation => animation.cancel());
      output.animate([{ opacity: .55, translate: "0 5px" }, { opacity: 1, translate: "0 0" }],
        { duration: 280, easing: "cubic-bezier(.2,.72,.24,1)" });
    }
  });
  exampleLanguage.closest(".language-control").hidden = false;
}

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const sections = document.querySelectorAll(
    ".section-heading:not(.demo-heading), .feature-card, .tutorial, .caption-lab, " +
    ".translation-card, .demo-grid, .download-card, .requirements-card"
  );
  const anchored = document.getElementById(location.hash.slice(1));
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) reveal(entry.target, true);
    }
  }, { rootMargin: "0px 0px -5% 0px" });

  function reveal(section, animate) {
    revealObserver.unobserve(section);
    section.classList.remove("reveal-pending");
    if (animate) section.classList.add("reveal-visible");
  }

  for (const section of sections) {
    if (section.getBoundingClientRect().top > window.innerHeight && !anchored?.contains(section)) {
      section.classList.add("reveal-pending");
      revealObserver.observe(section);
    }
  }

  document.addEventListener("focusin", event => {
    const section = event.target.closest(".reveal-pending, .reveal-visible");
    if (section) {
      reveal(section, false);
      section.classList.remove("reveal-visible");
    }
  });
}
