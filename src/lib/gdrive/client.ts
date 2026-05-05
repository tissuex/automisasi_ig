/**
 * Google Drive Client
 * Download file dari Google Drive menggunakan Service Account
 */

import { google } from "googleapis";

// Konfigurasi Google Drive
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GDRIVE_CLIENT_EMAIL,
    private_key: process.env.GDRIVE_PRIVATE_KEY,
  },
  scopes: SCOPES,
});

/**
 * Download file dari Google Drive
 * @param fileId ID file di Google Drive
 * @returns File content as Buffer
 */
export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  try {
    console.log(`⬇️  Downloading from Drive: ${fileId}`);
    
    const drive = google.drive({ version: "v3", auth });
    
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    console.error(`❌ Error downloading from Drive: ${error.message}`);
    throw new Error(`Google Drive download failed: ${error.message}`);
  }
}
