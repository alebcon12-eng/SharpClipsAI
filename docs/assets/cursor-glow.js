(() => {
  const enabled = window.matchMedia("(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)");
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.append(glow);

  let frame = null;
  let x = 0;
  let y = 0;

  function drawGlow() {
    frame = null;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    glow.classList.add("is-visible");
  }

  function hideGlow() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    glow.classList.remove("is-visible");
  }

  window.addEventListener("pointermove", event => {
    if (!enabled.matches || event.pointerType !== "mouse") return;
    x = event.clientX;
    y = event.clientY;
    frame ??= requestAnimationFrame(drawGlow);
  }, { passive: true });

  window.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse") hideGlow();
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", hideGlow);
  window.addEventListener("blur", hideGlow);
  enabled.addEventListener("change", hideGlow);
})();
