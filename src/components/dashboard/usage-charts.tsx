"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface DailyDataPoint {
	date: string;
	requests: number;
	creditsUsed: number;
}

interface EndpointDataPoint {
	endpoint: string;
	requests: number;
	creditsUsed: number;
}

export function UsageLineChart({ data }: { data: DailyDataPoint[] }) {
	if (data.length === 0) return null;

	return (
		<div className="h-[220px] w-full" style={{ minHeight: 220, minWidth: 0 }}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<defs>
						<linearGradient id="creditsGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#B59CFF" stopOpacity={0.25} />
							<stop offset="95%" stopColor="#B59CFF" stopOpacity={0} />
						</linearGradient>
						<linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#9FE2C8" stopOpacity={0.2} />
							<stop offset="95%" stopColor="#9FE2C8" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
					<XAxis
						dataKey="date"
						tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
						tickLine={false}
						axisLine={false}
						tickFormatter={(v: string) => v.slice(5)}
					/>
					<YAxis
						tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
						tickLine={false}
						axisLine={false}
						width={40}
					/>
					<Tooltip
						contentStyle={{
							background: "#16121F",
							border: "1px solid rgba(255,255,255,0.07)",
							borderRadius: "8px",
							fontSize: "12px",
							color: "#F5F1E8",
						}}
						labelStyle={{ color: "rgba(255,255,255,0.4)" }}
					/>
					<Area
						type="monotone"
						dataKey="creditsUsed"
						stroke="#B59CFF"
						strokeWidth={2}
						fill="url(#creditsGradient)"
						name="Credits"
					/>
					<Area
						type="monotone"
						dataKey="requests"
						stroke="#9FE2C8"
						strokeWidth={1.5}
						fill="url(#requestsGradient)"
						name="Requests"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

export function EndpointBarChart({ data }: { data: EndpointDataPoint[] }) {
	if (data.length === 0) return null;

	const formatted = data.map((d) => ({
		...d,
		label: d.endpoint.replace("/v1/", "").replace("/", " "),
	}));

	return (
		<div className="h-[180px] w-full" style={{ minHeight: 180, minWidth: 0 }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
						tickLine={false}
						axisLine={false}
					/>
					<YAxis
						tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
						tickLine={false}
						axisLine={false}
						width={40}
					/>
					<Tooltip
						contentStyle={{
							background: "#16121F",
							border: "1px solid rgba(255,255,255,0.07)",
							borderRadius: "8px",
							fontSize: "12px",
							color: "#F5F1E8",
						}}
					/>
					<Bar dataKey="requests" fill="#B59CFF" radius={[4, 4, 0, 0]} name="Requests" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

export function VerificationBadge({ rate }: { rate: number }) {
	const color = rate >= 90 ? "text-ok" : rate >= 50 ? "text-warn" : "text-err";
	return (
		<span className={`font-mono text-2xl font-semibold ${color}`}>
			{rate.toFixed(1)}%
		</span>
	);
}

export function BurnRateCard({
	avgDailyCredits,
	currentBalance,
	estimatedDaysRemaining,
}: {
	avgDailyCredits: number;
	currentBalance: number;
	estimatedDaysRemaining: number | null;
}) {
	const urgent = estimatedDaysRemaining !== null && estimatedDaysRemaining < 7;

	return (
		<div className="grid grid-cols-3 gap-4">
			<div>
				<p className="text-xs" style={{ color: "var(--ink-3)" }}>Avg/day</p>
				<p className="mt-1 font-mono text-lg font-semibold" style={{ color: "var(--ink)" }}>{avgDailyCredits}</p>
				<p className="text-[11px]" style={{ color: "var(--ink-3)" }}>credits</p>
			</div>
			<div>
				<p className="text-xs" style={{ color: "var(--ink-3)" }}>Balance</p>
				<p className="mt-1 font-mono text-lg font-semibold" style={{ color: "var(--ink)" }}>{currentBalance}</p>
				<p className="text-[11px]" style={{ color: "var(--ink-3)" }}>credits</p>
			</div>
			<div>
				<p className="text-xs" style={{ color: "var(--ink-3)" }}>Runway</p>
				<p className={`mt-1 font-mono text-lg font-semibold`} style={{ color: urgent ? "var(--err)" : "var(--ink)" }}>
					{estimatedDaysRemaining !== null ? `${estimatedDaysRemaining}d` : "\u221E"}
				</p>
				<p className="text-[11px]" style={{ color: "var(--ink-3)" }}>remaining</p>
			</div>
		</div>
	);
}
