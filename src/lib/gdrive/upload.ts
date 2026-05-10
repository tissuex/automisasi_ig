/**
 * Google Drive Upload Utility
 * ============================
 * Upload file ke Google Drive menggunakan Service Account
 * dan set permission publik agar bisa diakses Instagram API.
 */

import { google } from "googleapis";
import { Readable } from "stream";

// Folder tujuan upload di Google Drive
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID;

// Scope full drive access (diperlukan untuk upload + set permission)
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GDRIVE_CLIENT_EMAIL,
    private_key: process.env.GDRIVE_PRIVATE_KEY,
  },
  scopes: SCOPES,
});

/**
 * Upload file ke Google Drive.
 * @param fileBuffer - Buffer berisi konten file
 * @param fileName - Nama file asli
 * @param mimeType - MIME type file (e.g., "image/jpeg", "video/mp4")
 * @returns Google Drive file ID
 */
export async function uploadToGDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  console.log(`⬆️  Uploading to Drive: ${fileName} (${mimeType})`);

  const drive = google.drive({ version: "v3", auth });

  // Konversi Buffer ke Readable stream untuk upload
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const fileMetadata: { name: string; parents?: string[] } = {
    name: fileName,
  };

  // Jika folder ID tersedia, upload ke folder tersebut
  if (GDRIVE_FOLDER_ID) {
    fileMetadata.parents = [GDRIVE_FOLDER_ID];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  const fileId = response.data.id;

  if (!fileId) {
    throw new Error("Google Drive upload gagal: tidak ada file ID");
  }

  console.log(`   ✅ Uploaded! File ID: ${fileId}`);
  return fileId;
}

/**
 * Set permission file di Google Drive menjadi publik.
 * "Anyone with the link" bisa melihat/download file.
 * @param fileId - Google Drive file ID
 */
export async function setGDrivePublicPermission(
  fileId: string
): Promise<void> {
  console.log(`🔓 Setting public permission for: ${fileId}`);

  const drive = google.drive({ version: "v3", auth });

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  console.log(`   ✅ File is now public`);
}

/**
 * Deteksi media_type Instagram dari MIME type file.
 * @param mimeType - MIME type file
 * @returns "IMAGE" atau "VIDEO"
 */
export function detectMediaType(mimeType: string): "IMAGE" | "VIDEO" {
  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }
  return "IMAGE";
}
