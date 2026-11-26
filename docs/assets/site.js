const navigation = document.querySelector(".navigation");
const menuToggle = navigation.querySelector(".menu-toggle");
const menu = document.getElementById("menu");
const mobileLayout = window.matchMedia("(max-width: 740px)");

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

  const heading = document.querySelector(link.hash)?.querySelector("h2");
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

for (const button of document.querySelectorAll(".caption-play")) {
  const player = document.getElementById(button.getAttribute("aria-controls"));
  const styleName = document.getElementById(player.getAttribute("aria-labelledby")).textContent;

  function updatePlayButton() {
    const label = player.paused ? "Ver animação" : "Pausar";
    button.textContent = label;
    const action = player.paused ? label : "Pausar animação";
    button.setAttribute("aria-label", action + " de " + styleName);
  }

  player.controls = false;
  button.hidden = false;
  updatePlayButton();
  player.addEventListener("play", updatePlayButton);
  player.addEventListener("pause", updatePlayButton);
  player.addEventListener("ended", () => {
    player.load();
    updatePlayButton();
  });

  button.addEventListener("click", async () => {
    if (!player.paused) {
      player.pause();
      return;
    }
    try {
      await player.play();
    } catch {
      player.controls = true;
      button.hidden = true;
      player.focus();
    }
  });
}
