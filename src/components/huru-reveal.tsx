"use client";

import { useEffect } from "react";

/**
 * Mounts an IntersectionObserver that adds `is-in` to any element
 * with `[data-reveal]` once it enters the viewport. CSS handles
 * the actual reveal transition (see globals.css).
 */
export function HuruReveal() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (prefersReducedMotion) {
			document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
				el.classList.add("is-in");
			});
			return;
		}

		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						e.target.classList.add("is-in");
						io.unobserve(e.target);
					}
				}
			},
			{ rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
		);

		document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => io.observe(el));

		return () => io.disconnect();
	}, []);

	return null;
}
