import "./ai-bg-animation.js";

function initBackgroundDimOnScroll() {
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const bgCanvas = document.getElementById("bg");

  const updateDimState = () => {
    const start = window.innerHeight * 0.08;
    const rampDistance = window.innerHeight * 1.05;
    const progress = (window.scrollY - start) / rampDistance;
    const dimStrength = clamp01(progress * 1.5);
    document.body.style.setProperty("--bg-dim-strength", `${dimStrength}`);

    if (bgCanvas) {
      const bgOpacity = 1 - dimStrength * 0.95;
      bgCanvas.style.opacity = `${Math.max(0.1, bgOpacity)}`;
    }
  };

  updateDimState();
  window.addEventListener("scroll", updateDimState, { passive: true });
  window.addEventListener("resize", updateDimState);
}

function initHomeRevealObserver() {
  const scheduleSection = document.getElementById("schedule");
  if (!scheduleSection) return;

  const revealTargets = document.querySelectorAll(
    ".hero-logo, .panel, .schedule-day, .schedule-item, .hero-description",
  );
  if (revealTargets.length === 0) return;

  revealTargets.forEach((el) => {
    if (el.classList.contains("hero-logo")) {
      el.classList.add("reveal-observer-hero-logo");
    } else {
      el.classList.add("reveal-observer");
    }
  });

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const observerThreshold = isMobile ? 0.1 : 0.16;
  const observerRootMargin = isMobile ? "0px 0px 5% 0px" : "0px 0px -10% 0px";

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-observer-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      threshold: observerThreshold,
      rootMargin: observerRootMargin,
    },
  );

  revealTargets.forEach((el) => observer.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initBackgroundDimOnScroll();
    initHomeRevealObserver();
  });
} else {
  initBackgroundDimOnScroll();
  initHomeRevealObserver();
}
