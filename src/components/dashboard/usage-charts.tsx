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
		<div className="h-[220px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<defs>
						<linearGradient id="creditsGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#0a0a0a" stopOpacity={0.15} />
							<stop offset="95%" stopColor="#0a0a0a" stopOpacity={0} />
						</linearGradient>
						<linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
							<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
					<XAxis
						dataKey="date"
						tick={{ fontSize: 11, fill: "#737373" }}
						tickLine={false}
						axisLine={false}
						tickFormatter={(v: string) => v.slice(5)}
					/>
					<YAxis
						tick={{ fontSize: 11, fill: "#737373" }}
						tickLine={false}
						axisLine={false}
						width={40}
					/>
					<Tooltip
						contentStyle={{
							background: "#1a1a1a",
							border: "none",
							borderRadius: "8px",
							fontSize: "12px",
							color: "#fff",
						}}
						labelStyle={{ color: "#a3a3a3" }}
					/>
					<Area
						type="monotone"
						dataKey="creditsUsed"
						stroke="#0a0a0a"
						strokeWidth={2}
						fill="url(#creditsGradient)"
						name="Credits"
					/>
					<Area
						type="monotone"
						dataKey="requests"
						stroke="#6366f1"
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
		<div className="h-[180px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "#737373" }}
						tickLine={false}
						axisLine={false}
					/>
					<YAxis
						tick={{ fontSize: 11, fill: "#737373" }}
						tickLine={false}
						axisLine={false}
						width={40}
					/>
					<Tooltip
						contentStyle={{
							background: "#1a1a1a",
							border: "none",
							borderRadius: "8px",
							fontSize: "12px",
							color: "#fff",
						}}
					/>
					<Bar dataKey="requests" fill="#0a0a0a" radius={[4, 4, 0, 0]} name="Requests" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

export function VerificationBadge({ rate }: { rate: number }) {
	const color = rate >= 90 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-500";
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
				<p className="text-xs text-og-text-3">Avg/day</p>
				<p className="mt-1 font-mono text-lg font-semibold text-og-black">{avgDailyCredits}</p>
				<p className="text-[11px] text-og-text-3">credits</p>
			</div>
			<div>
				<p className="text-xs text-og-text-3">Balance</p>
				<p className="mt-1 font-mono text-lg font-semibold text-og-black">{currentBalance}</p>
				<p className="text-[11px] text-og-text-3">credits</p>
			</div>
			<div>
				<p className="text-xs text-og-text-3">Runway</p>
				<p className={`mt-1 font-mono text-lg font-semibold ${urgent ? "text-red-500" : "text-og-black"}`}>
					{estimatedDaysRemaining !== null ? `${estimatedDaysRemaining}d` : "\u221E"}
				</p>
				<p className="text-[11px] text-og-text-3">remaining</p>
			</div>
		</div>
	);
}
