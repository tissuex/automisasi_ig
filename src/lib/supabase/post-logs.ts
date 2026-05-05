/**
 * Post Log Queries
 * ==================
 * Helper functions untuk tabel `post_logs`.
 * Digunakan untuk mencatat setiap aksi pada jadwal posting.
 */

import { getSupabaseAdmin } from "./client";
import type { PostLog, PostLogInsert } from "./types";

// ─── CREATE ───────────────────────────────────────────────────

/**
 * Catat log baru untuk suatu jadwal.
 * Dipanggil di setiap langkah proses cron:
 * - cron_trigger: Cron memicu jadwal
 * - gdrive_download: Download file dari GDrive
 * - ig_create_container: Buat media container di IG
 * - ig_publish: Publish media ke IG
 */
export async function createPostLog(input: PostLogInsert): Promise<PostLog> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("post_logs")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`[createPostLog] ${error.message}`);
  }

  return data;
}

/**
 * Shortcut: Catat log sukses.
 */
export async function logSuccess(
  scheduleId: string,
  action: string,
  message?: string,
  payload?: Record<string, unknown>
): Promise<PostLog> {
  return createPostLog({
    schedule_id: scheduleId,
    action,
    status: "success",
    message: message ?? null,
    payload: payload ?? null,
  });
}

/**
 * Shortcut: Catat log error.
 */
export async function logError(
  scheduleId: string,
  action: string,
  message: string,
  payload?: Record<string, unknown>
): Promise<PostLog> {
  return createPostLog({
    schedule_id: scheduleId,
    action,
    status: "error",
    message,
    payload: payload ?? null,
  });
}

// ─── READ ─────────────────────────────────────────────────────

/**
 * Ambil semua log, urut terbaru dulu.
 * Opsional limit untuk pagination.
 */
export async function getPostLogs(limit: number = 50): Promise<PostLog[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("post_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[getPostLogs] ${error.message}`);
  }

  return data ?? [];
}

/**
 * Ambil log untuk jadwal tertentu.
 */
export async function getLogsByScheduleId(scheduleId: string): Promise<PostLog[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("post_logs")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`[getLogsByScheduleId] ${error.message}`);
  }

  return data ?? [];
}
