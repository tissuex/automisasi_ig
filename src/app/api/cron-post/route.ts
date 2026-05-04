/**
 * API Route: POST /api/cron-post — Inisialisasi di Tahap 5
 * Endpoint yang dipanggil cron-job.org setiap interval.
 * Flow: cek jadwal → download GDrive → post IG → update DB.
 */
import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Implementasi di Tahap 5
  return NextResponse.json({ message: "Cron endpoint — belum diimplementasi" });
}
