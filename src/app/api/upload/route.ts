/**
 * API Route: POST /api/upload
 * =============================
 * Menerima file upload dari form (FormData), upload ke Supabase Storage,
 * deteksi media_type, lalu simpan jadwal ke database.
 *
 * FormData fields:
 * - file: File (gambar atau video)
 * - caption: string
 * - scheduled_at: string (ISO datetime)
 * - user_email: string (email pengguna dari sesi auth)
 */

import { type NextRequest } from "next/server";
import { uploadMedia, detectMediaType } from "@/lib/gdrive/upload";
import { createSchedule } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Ambil fields dari FormData
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;
    const scheduledAt = formData.get("scheduled_at") as string | null;
    const userEmail = formData.get("user_email") as string | null;

    // Validasi input
    if (!file || !caption || !scheduledAt) {
      return Response.json(
        { error: "Field wajib: file, caption, scheduled_at" },
        { status: 400 }
      );
    }

    // Validasi tipe file
    const mimeType = file.type;
    if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
      return Response.json(
        { error: "File harus berupa gambar atau video" },
        { status: 400 }
      );
    }

    // Deteksi media type dari MIME
    const mediaType = detectMediaType(mimeType);

    console.log(`📦 Upload request: ${file.name} (${mimeType}) → ${mediaType}`);

    // Konversi File ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Supabase Storage → dapatkan public URL
    const publicUrl = await uploadMedia(buffer, file.name, mimeType);

    // Simpan jadwal ke database
    // gdrive_file_id sekarang berisi public URL langsung
    const schedule = await createSchedule({
      gdrive_file_id: publicUrl,
      media_type: mediaType,
      caption,
      scheduled_at: scheduledAt,
      user_email: userEmail || null,
    });

    console.log(`✅ Schedule created: ${schedule.id}`);

    return Response.json({ schedule }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return Response.json(
      { error: error.message || "Gagal mengupload file" },
      { status: 500 }
    );
  }
}
