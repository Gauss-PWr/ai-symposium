import "./ai-bg-animation.js";


function initHomeFirstVisitObserver() {
	const scheduleSection = document.getElementById("schedule");
	if (!scheduleSection) return;

	
	const revealTargets = document.querySelectorAll(
		".hero-logo, .panel, .schedule-day, .schedule-item"
	);
	if (revealTargets.length === 0) return;

	revealTargets.forEach((el) => {
		el.classList.add("reveal-first-visit");
		if (el.classList.contains("hero-logo")) {
			el.classList.add("reveal-hero-logo");
		}
	});

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add("reveal-visible");
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
	document.addEventListener("DOMContentLoaded", initHomeFirstVisitObserver);
} else {
	initHomeFirstVisitObserver();
}
