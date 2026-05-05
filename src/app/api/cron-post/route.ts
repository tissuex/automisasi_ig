/**
 * API Route: POST /api/cron-post
 * ================================
 * Endpoint yang dipanggil oleh cron-job.org setiap interval (misal 5 menit).
 *
 * Flow:
 * 1. Validasi CRON_SECRET
 * 2. Ambil jadwal yang sudah waktunya (getDueSchedules)
 * 3. Untuk setiap jadwal:
 *    a. Update status → "processing"
 *    b. Generate public URL dari Google Drive
 *    c. Post ke Instagram (create container → publish)
 *    d. Update status → "posted" + simpan ig_post_id
 *    e. Catat log di post_logs
 * 4. Return hasil summary
 */

import { type NextRequest } from "next/server";
import {
  getDueSchedules,
  updateScheduleStatus,
  logSuccess,
  logError,
} from "@/lib/supabase";
import { postToInstagram } from "@/lib/instagram/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ─── 1. Validasi CRON_SECRET ──────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedSecret =
    authHeader?.replace("Bearer ", "") ||
    request.nextUrl.searchParams.get("secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ─── 2. Ambil jadwal yang due ─────────────────────────────
    const dueSchedules = await getDueSchedules();

    if (dueSchedules.length === 0) {
      return Response.json({
        message: "Tidak ada jadwal yang perlu diproses",
        processed: 0,
      });
    }

    console.log(`🕐 Cron: ${dueSchedules.length} jadwal ditemukan`);

    // ─── 3. Proses setiap jadwal ──────────────────────────────
    const results: Array<{
      id: string;
      status: "posted" | "failed";
      igPostId?: string;
      error?: string;
    }> = [];

    for (const schedule of dueSchedules) {
      console.log(`\n📌 Processing: ${schedule.id}`);

      try {
        // 3a. Update status → processing
        await updateScheduleStatus(schedule.id, "processing");
        await logSuccess(schedule.id, "cron_trigger", "Jadwal mulai diproses");

        // 3b. Generate public URL
        const mediaUrl = `https://drive.google.com/uc?export=download&id=${schedule.gdrive_file_id}`;

        await logSuccess(
          schedule.id,
          "gdrive_url",
          `URL: ${mediaUrl}`
        );

        // 3c. Post ke Instagram
        const result = await postToInstagram({
          mediaUrl,
          caption: schedule.caption,
          mediaType: schedule.media_type as "IMAGE" | "VIDEO",
        });

        // 3d. Update status → posted
        await updateScheduleStatus(schedule.id, "posted", result.igPostId);
        await logSuccess(
          schedule.id,
          "ig_publish",
          `Berhasil posting! IG Post ID: ${result.igPostId}`,
          { igPostId: result.igPostId, containerId: result.containerId }
        );

        results.push({
          id: schedule.id,
          status: "posted",
          igPostId: result.igPostId,
        });

        console.log(`✅ Posted: ${schedule.id} → ${result.igPostId}`);
      } catch (error: any) {
        // 3e. Gagal — update status dan catat error
        await updateScheduleStatus(schedule.id, "failed");
        await logError(
          schedule.id,
          "ig_publish",
          error.message,
          { stack: error.stack }
        );

        results.push({
          id: schedule.id,
          status: "failed",
          error: error.message,
        });

        console.error(`❌ Failed: ${schedule.id} — ${error.message}`);
      }
    }

    // ─── 4. Return summary ────────────────────────────────────
    const posted = results.filter((r) => r.status === "posted").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return Response.json({
      message: `Cron selesai: ${posted} posted, ${failed} failed`,
      processed: results.length,
      posted,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("❌ Cron error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
