/**
 * API Route: /api/schedules
 * ==========================
 * GET  — List semua jadwal (opsional filter ?status=pending)
 * POST — Buat jadwal baru
 */

import { type NextRequest } from "next/server";
import {
  getSchedules,
  createSchedule,
  type ScheduleStatus,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** GET /api/schedules?status=pending */
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") as
      | ScheduleStatus
      | null;

    const schedules = await getSchedules(status ?? undefined);

    return Response.json({ schedules, count: schedules.length });
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/** POST /api/schedules — body: { gdrive_file_id, media_type, caption, scheduled_at } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi input
    const { gdrive_file_id, media_type, caption, scheduled_at } = body;

    if (!gdrive_file_id || !media_type || !caption || !scheduled_at) {
      return Response.json(
        {
          error: "Field wajib: gdrive_file_id, media_type, caption, scheduled_at",
        },
        { status: 400 }
      );
    }

    if (!["IMAGE", "VIDEO", "CAROUSEL"].includes(media_type)) {
      return Response.json(
        { error: "media_type harus IMAGE, VIDEO, atau CAROUSEL" },
        { status: 400 }
      );
    }

    const schedule = await createSchedule({
      gdrive_file_id,
      media_type,
      caption,
      scheduled_at,
    });

    return Response.json({ schedule }, { status: 201 });
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
