/**
 * API Route: /api/schedules/[id]
 * ================================
 * GET    — Ambil jadwal berdasarkan ID
 * PUT    — Update jadwal
 * DELETE — Hapus jadwal
 */

import { type NextRequest } from "next/server";
import {
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} from "@/lib/supabase";
import { extractGDriveId } from "@/lib/gdrive/utils";

/** GET /api/schedules/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const schedule = await getScheduleById(id);

    if (!schedule) {
      return Response.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    return Response.json({ schedule });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/** PUT /api/schedules/[id] — body: partial schedule fields */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Cek apakah jadwal ada
    const existing = await getScheduleById(id);
    if (!existing) {
      return Response.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi media_type jika disertakan
    if (body.media_type && !["IMAGE", "VIDEO", "CAROUSEL"].includes(body.media_type)) {
      return Response.json(
        { error: "media_type harus IMAGE, VIDEO, atau CAROUSEL" },
        { status: 400 }
      );
    }

    // Proses gdrive_file_id melalui extractor jika disertakan
    const updates = { ...body };
    if (updates.gdrive_file_id) {
      updates.gdrive_file_id = extractGDriveId(updates.gdrive_file_id);
    }

    const schedule = await updateSchedule(id, updates);

    return Response.json({ schedule });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/schedules/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const deleted = await deleteSchedule(id);

    if (!deleted) {
      return Response.json(
        { error: "Jadwal tidak ditemukan" },
        { status: 404 }
      );
    }

    return Response.json({ message: "Jadwal berhasil dihapus" });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
