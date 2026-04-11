import "./ai-bg-animation.js";


function initHomeRevealObserver() {
	const scheduleSection = document.getElementById("schedule");
	if (!scheduleSection) return;

	
	const revealTargets = document.querySelectorAll(
		".hero-logo, .panel, .schedule-day, .schedule-item, .hero-description"
	);
	if (revealTargets.length === 0) return;

	revealTargets.forEach((el) => {
        if (el.classList.contains("hero-logo")) {
            el.classList.add("reveal-observer-hero-logo");
    
		} else {
            el.classList.add("reveal-observer");
        }
	});

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
			threshold: 0.16,
			rootMargin: "0px 0px -10% 0px",
		}
	);

	revealTargets.forEach((el) => observer.observe(el));
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initHomeRevealObserver);
} else {
	initHomeRevealObserver();
}
