"use client";

import { useState } from "react";

export function CopyPromptButton({ prompt }: { prompt: string }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// clipboard blocked — silently fail; the prompt is visible below anyway
		}
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="inline-flex items-center gap-1.5 rounded-[6px] border border-og-border bg-og-surface px-3 py-1.5 text-[12.5px] font-medium text-og-black transition-colors hover:bg-og-surface-2"
		>
			{copied ? (
				<>
					<svg
						className="h-3.5 w-3.5"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
							clipRule="evenodd"
						/>
					</svg>
					Copied
				</>
			) : (
				<>
					<svg
						className="h-3.5 w-3.5"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						aria-hidden="true"
					>
						<rect x="6" y="6" width="10" height="10" rx="1.5" />
						<path d="M4 14V5a1 1 0 011-1h9" strokeLinecap="round" />
					</svg>
					Copy prompt
				</>
			)}
		</button>
	);
}
