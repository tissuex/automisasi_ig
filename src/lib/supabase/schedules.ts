/**
 * Schedule Queries
 * =================
 * Helper functions untuk CRUD operasi tabel `schedules`.
 * Semua fungsi menggunakan admin client (bypass RLS).
 */

import { getSupabaseAdmin } from "./client";
import type { Schedule, ScheduleInsert, ScheduleUpdate, ScheduleStatus } from "./types";

// ─── READ ─────────────────────────────────────────────────────

/**
 * Ambil semua jadwal, urut berdasarkan scheduled_at (ascending).
 * Opsional filter berdasarkan status.
 */
export async function getSchedules(status?: ScheduleStatus): Promise<Schedule[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from("schedules")
    .select("*")
    .order("scheduled_at", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[getSchedules] ${error.message}`);
  }

  return data ?? [];
}

/**
 * Ambil satu jadwal berdasarkan ID.
 */
export async function getScheduleById(id: string): Promise<Schedule | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("schedules")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // .single() throws error jika tidak ditemukan — return null
    if (error.code === "PGRST116") return null;
    throw new Error(`[getScheduleById] ${error.message}`);
  }

  return data;
}

/**
 * Ambil jadwal yang siap diproses oleh cron.
 * Kondisi: status = "pending" DAN scheduled_at <= sekarang.
 */
export async function getDueSchedules(): Promise<Schedule[]> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("schedules")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw new Error(`[getDueSchedules] ${error.message}`);
  }

  return data ?? [];
}

// ─── CREATE ───────────────────────────────────────────────────

/**
 * Buat jadwal posting baru.
 * Otomatis set status = "pending" jika tidak diberikan.
 */
export async function createSchedule(input: ScheduleInsert): Promise<Schedule> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("schedules")
    .insert({
      ...input,
      status: input.status ?? "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`[createSchedule] ${error.message}`);
  }

  return data;
}

// ─── UPDATE ───────────────────────────────────────────────────

/**
 * Update jadwal berdasarkan ID.
 * Otomatis set updated_at ke waktu sekarang.
 */
export async function updateSchedule(
  id: string,
  updates: ScheduleUpdate
): Promise<Schedule> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("schedules")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`[updateSchedule] ${error.message}`);
  }

  return data;
}

/**
 * Update status jadwal (shortcut).
 * Digunakan oleh cron saat memproses jadwal.
 */
export async function updateScheduleStatus(
  id: string,
  status: ScheduleStatus,
  igPostId?: string
): Promise<Schedule> {
  return updateSchedule(id, {
    status,
    ig_post_id: igPostId ?? undefined,
  });
}

// ─── DELETE ───────────────────────────────────────────────────

/**
 * Hapus jadwal berdasarkan ID.
 * Returns true jika berhasil, false jika tidak ditemukan.
 */
export async function deleteSchedule(id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { error, count } = await db
    .from("schedules")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw new Error(`[deleteSchedule] ${error.message}`);
  }

  return (count ?? 0) > 0;
}
