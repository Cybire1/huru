"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "./huru-icons";

const NAV_ITEMS = [
	{ key: "how", num: "01", label: "How it works", href: "/#how", caption: "Verify, attest, settle." },
	{ key: "manifesto", num: "02", label: "Features", href: "/#manifesto", caption: "Built for devs, not crypto." },
	{ key: "models", num: "03", label: "Models", href: "/#models", caption: "13 models, one key." },
	{ key: "pricing", num: "04", label: "Pricing", href: "/#pricing", caption: "Pay what you ship." },
	{ key: "docs", num: "05", label: "Docs", href: "/docs", caption: "Quickstart in 3 lines." },
	{ key: "ai", num: "06", label: "AI assistants", href: "/docs/ai-assistants", caption: "Claude, Cursor, Codex." },
];

export function HuruMobileMenu() {
	const [open, setOpen] = useState(false);
	const { theme, setTheme } = useTheme();
	const pathname = usePathname();

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<>
			<button
				className={`hm-trigger ${open ? "is-open" : ""}`}
				aria-label={open ? "Close menu" : "Open menu"}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				<span className="hm-bars" aria-hidden="true">
					<i />
					<i />
					<i />
				</span>
			</button>

			<div className={`hm-overlay ${open ? "is-open" : ""}`} aria-hidden={!open}>
				<div className="hm-grain" aria-hidden="true" />
				<div className="hm-bg" aria-hidden="true" />

				<div className="hm-head">
					<span className="hm-eyebrow">
						<i className="hm-pulse" /> Huru &middot; <span className="hm-acc">live</span>
					</span>
					<button
						className="hm-close"
						type="button"
						onClick={() => setOpen(false)}
						aria-label="Close menu"
					>
						Close
					</button>
				</div>

				<nav className="hm-nav" aria-label="Mobile">
					{NAV_ITEMS.map((it, i) => (
						<Link
							key={it.key}
							href={it.href}
							className="hm-item"
							style={{ ["--i" as never]: i }}
							onClick={() => setOpen(false)}
						>
							<span className="hm-num">{it.num}</span>
							<span className="hm-label">{it.label}</span>
							<span className="hm-caption">{it.caption}</span>
							<span className="hm-arrow" aria-hidden="true">
								<Icon.Arrow width={14} height={14} />
							</span>
						</Link>
					))}
				</nav>

				<div className="hm-foot">
					<div className="hm-foot-row">
						<button
							type="button"
							className="hm-pill"
							onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						>
							{theme === "dark" ? <Icon.Sun /> : <Icon.Moon />}
							<span>{theme === "dark" ? "Light" : "Dark"} mode</span>
						</button>
						<a className="hm-pill" href="https://github.com/Cybire1/huru" target="_blank" rel="noreferrer">
							<Icon.Github />
							<span>GitHub</span>
						</a>
					</div>

					<Link href="/dashboard" className="hm-cta" onClick={() => setOpen(false)}>
						<span>Get API key</span>
						<span className="hm-cta-arrow" aria-hidden="true">
							<Icon.Arrow width={16} height={16} />
						</span>
					</Link>

					<p className="hm-fineprint">
						200 free credits on signup. No card. Cancel anytime &mdash; nothing to cancel.
					</p>
				</div>
			</div>
		</>
	);
}
