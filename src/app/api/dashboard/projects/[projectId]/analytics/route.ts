import { type NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/huru/errors";
import { getBearerToken } from "@/lib/huru/http";
import { getDashboardAnalytics } from "@/lib/huru/dashboard";

type RouteContext = {
	params: Promise<{
		projectId: string;
	}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
	const token = getBearerToken(request);
	if (!token) {
		return jsonError(401, "authentication_error", "invalid_session", "Sign in required.");
	}

	const { projectId } = await context.params;
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize")) || 20));
	const endpointFilter = url.searchParams.get("endpoint") || undefined;
	const statusFilter = url.searchParams.get("status") || undefined;

	const analytics = await getDashboardAnalytics(token, projectId, {
		page,
		pageSize,
		endpointFilter,
		statusFilter,
	});

	if (!analytics) {
		return jsonError(404, "invalid_request", "project_not_found", "Project not found.");
	}

	return NextResponse.json(analytics);
}
