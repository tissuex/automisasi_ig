/**
 * Google Drive Utilities
 * ======================
 * Shared helper untuk mengekstrak File ID dari berbagai format URL Google Drive.
 * Dipakai di client (form input) maupun server (cron, API).
 */

/**
 * Ekstrak Google Drive File ID dari berbagai format URL.
 * Mendukung:
 *   - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   - https://drive.google.com/open?id=FILE_ID
 *   - https://drive.google.com/uc?id=FILE_ID&export=download
 *   - Raw FILE_ID (langsung dikembalikan)
 */
export function extractGDriveId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Pattern 1: /file/d/FILE_ID/
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Pattern 2: ?id=FILE_ID or &id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  // Pattern 3: /folders/FOLDER_ID (edge case)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // Bukan URL → kembalikan apa adanya (raw ID)
  return trimmed;
}

/**
 * Generate public direct-download URL dari Google Drive File ID.
 * Menggunakan format liftoff yang lebih reliable untuk akses publik.
 */
export function getGDriveDirectUrl(fileId: string): string {
  // Pastikan kita punya ID bersih
  const cleanId = extractGDriveId(fileId);
  return `https://lh3.googleusercontent.com/d/${cleanId}`;
}
