/**
 * API Route: GET /api/logs
 * ==========================
 * List log posting (terbaru dulu).
 * Query params: ?limit=50&schedule_id=xxx
 */

import { type NextRequest } from "next/server";
import { getPostLogs, getLogsByScheduleId } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const scheduleId = request.nextUrl.searchParams.get("schedule_id");
    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") || "50",
      10
    );

    let logs;

    if (scheduleId) {
      logs = await getLogsByScheduleId(scheduleId);
    } else {
      logs = await getPostLogs(limit);
    }

    return Response.json({ logs, count: logs.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
