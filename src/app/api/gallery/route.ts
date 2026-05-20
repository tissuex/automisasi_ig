/**
 * API Route: GET /api/gallery
 * =============================
 * Mengambil daftar media (gambar/video) yang sudah diupload oleh semua user.
 * Data diambil dari tabel `schedules` — setiap schedule memiliki media URL
 * di kolom `gdrive_file_id`.
 *
 * Query params:
 * - limit: jumlah item (default 50)
 * - offset: pagination offset (default 0)
 * - media_type: filter IMAGE atau VIDEO (opsional)
 */

import { type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const mediaType = searchParams.get("media_type");

    const db = getSupabaseAdmin();

    // Query schedules yang memiliki media URL
    let query = db
      .from("schedules")
      .select("id, gdrive_file_id, media_type, caption, user_email, status, scheduled_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter berdasarkan media_type jika diberikan
    if (mediaType && ["IMAGE", "VIDEO"].includes(mediaType)) {
      query = query.eq("media_type", mediaType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Gagal mengambil data galeri: ${error.message}`);
    }

    // Transform data — rename gdrive_file_id jadi media_url biar lebih jelas
    const items = (data ?? []).map((item) => ({
      id: item.id,
      media_url: item.gdrive_file_id,
      media_type: item.media_type,
      caption: item.caption,
      user_email: item.user_email,
      status: item.status,
      scheduled_at: item.scheduled_at,
      created_at: item.created_at,
    }));

    return Response.json({
      items,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("❌ Gallery API error:", error);
    return Response.json(
      { error: error.message || "Gagal memuat galeri" },
      { status: 500 }
    );
  }
}
