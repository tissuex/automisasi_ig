/**
 * Instagram Graph API Client
 * ============================
 * Helper untuk posting media ke Instagram via Graph API.
 *
 * Flow:
 * 1. Create media container (kirim URL + caption)
 * 2. Tunggu processing (khusus VIDEO)
 * 3. Publish container → post muncul di feed
 *
 * Env vars:
 * - IG_USER_ID: Instagram Business Account ID
 * - IG_ACCESS_TOKEN: Long-lived access token
 */

const IG_API_BASE = "https://graph.facebook.com/v21.0";

// ─── Types ────────────────────────────────────────────────────

export interface CreateContainerParams {
  imageUrl?: string;
  videoUrl?: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO";
}

export interface ContainerStatus {
  id: string;
  status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  error_message?: string;
}

export interface PublishResult {
  igPostId: string;
  containerId: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function getEnv() {
  const userId = process.env.IG_USER_ID;
  const accessToken = process.env.IG_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    throw new Error("Missing IG_USER_ID atau IG_ACCESS_TOKEN di .env.local");
  }

  return { userId, accessToken };
}

/** Delay helper untuk polling */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core Functions ───────────────────────────────────────────

/**
 * Step 1: Buat media container di Instagram.
 * Instagram akan download media dari URL yang diberikan.
 */
export async function createMediaContainer(
  params: CreateContainerParams
): Promise<string> {
  const { userId, accessToken } = getEnv();

  const body: Record<string, string> = {
    caption: params.caption,
    access_token: accessToken,
  };

  if (params.mediaType === "IMAGE") {
    if (!params.imageUrl) throw new Error("imageUrl wajib diisi untuk IMAGE");
    body.image_url = params.imageUrl;
  } else if (params.mediaType === "VIDEO") {
    if (!params.videoUrl) throw new Error("videoUrl wajib diisi untuk VIDEO");
    body.video_url = params.videoUrl;
    body.media_type = "REELS";
  }

  console.log(`📦 Creating media container (${params.mediaType})...`);

  const response = await fetch(`${IG_API_BASE}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errMsg = data.error?.message || JSON.stringify(data);
    throw new Error(`Create container gagal: ${errMsg}`);
  }

  console.log(`   ✅ Container ID: ${data.id}`);
  return data.id;
}

/**
 * Step 2: Cek status container (untuk VIDEO yang butuh processing time).
 */
export async function checkContainerStatus(
  containerId: string
): Promise<ContainerStatus> {
  const { accessToken } = getEnv();

  const response = await fetch(
    `${IG_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    const errMsg = data.error?.message || JSON.stringify(data);
    throw new Error(`Check status gagal: ${errMsg}`);
  }

  return {
    id: data.id,
    status_code: data.status_code,
    error_message: data.error_message,
  };
}

/**
 * Step 2b: Tunggu sampai container selesai processing (polling).
 * Khusus VIDEO — biasanya perlu 10-60 detik.
 */
export async function waitForContainer(
  containerId: string,
  maxWaitMs: number = 120_000,
  intervalMs: number = 5_000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkContainerStatus(containerId);
    console.log(`   ⏳ Container status: ${status.status_code}`);

    if (status.status_code === "FINISHED") {
      return;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(
        `Container ${status.status_code}: ${status.error_message || "unknown error"}`
      );
    }

    await delay(intervalMs);
  }

  throw new Error(`Container timeout setelah ${maxWaitMs / 1000} detik`);
}

/**
 * Step 3: Publish container ke Instagram feed.
 */
export async function publishMedia(containerId: string): Promise<string> {
  const { userId, accessToken } = getEnv();

  console.log(`🚀 Publishing container ${containerId}...`);

  const response = await fetch(`${IG_API_BASE}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errMsg = data.error?.message || JSON.stringify(data);
    throw new Error(`Publish gagal: ${errMsg}`);
  }

  console.log(`   ✅ Published! IG Post ID: ${data.id}`);
  return data.id;
}

// ─── High-Level Function ──────────────────────────────────────

/**
 * All-in-one: Create container → Wait (if video) → Publish.
 * Ini yang dipanggil oleh cron job.
 */
export async function postToInstagram(params: {
  mediaUrl: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO";
}): Promise<PublishResult> {
  // Step 1: Create container
  const containerId = await createMediaContainer({
    imageUrl: params.mediaType === "IMAGE" ? params.mediaUrl : undefined,
    videoUrl: params.mediaType === "VIDEO" ? params.mediaUrl : undefined,
    caption: params.caption,
    mediaType: params.mediaType,
  });

  // Step 2: Wait if video
  if (params.mediaType === "VIDEO") {
    console.log("⏳ Menunggu video processing...");
    await waitForContainer(containerId);
  } else {
    // IMAGE juga perlu sedikit waktu
    await delay(3000);
  }

  // Step 3: Publish
  const igPostId = await publishMedia(containerId);

  return { igPostId, containerId };
}
