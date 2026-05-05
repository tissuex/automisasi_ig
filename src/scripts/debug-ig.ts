/**
 * Debug Script — Cek Instagram API Credentials
 * ==============================================
 * Verifikasi IG_USER_ID dan IG_ACCESS_TOKEN valid.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const IG_API_BASE = "https://graph.facebook.com/v21.0";
const accessToken = process.env.IG_ACCESS_TOKEN;
const userId = process.env.IG_USER_ID;

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  🔍 Instagram API — Debug Credentials   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  console.log(`📌 IG_USER_ID     : ${userId}`);
  console.log(`📌 IG_ACCESS_TOKEN: ${accessToken?.slice(0, 20)}...${accessToken?.slice(-10)}\n`);

  // Test 1: Cek apakah token valid (ambil info token)
  console.log("🔑 Test 1: Validasi access token...");
  try {
    const tokenRes = await fetch(
      `${IG_API_BASE}/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.data) {
      console.log(`   ✅ Token valid`);
      console.log(`   App ID  : ${tokenData.data.app_id}`);
      console.log(`   Type    : ${tokenData.data.type}`);
      console.log(`   User ID : ${tokenData.data.user_id}`);
      console.log(`   Expires : ${tokenData.data.expires_at ? new Date(tokenData.data.expires_at * 1000).toISOString() : "Never"}`);
      console.log(`   Scopes  : ${tokenData.data.scopes?.join(", ")}`);
      console.log();
    } else {
      console.log(`   ❌ Token invalid:`, tokenData.error?.message);
      console.log();
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }

  // Test 2: Ambil Facebook Pages yang terhubung
  console.log("📄 Test 2: Cek Facebook Pages terhubung...");
  try {
    const pagesRes = await fetch(
      `${IG_API_BASE}/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.data?.length > 0) {
      console.log(`   ✅ Ditemukan ${pagesData.data.length} page(s):\n`);
      for (const page of pagesData.data) {
        console.log(`   📄 Page: ${page.name}`);
        console.log(`      Page ID: ${page.id}`);
        console.log(`      Access Token: ${page.access_token?.slice(0, 20)}...`);

        // Test 3: Cek IG Business Account terhubung ke page ini
        console.log(`\n   📸 Cek Instagram Business Account untuk page "${page.name}"...`);
        const igRes = await fetch(
          `${IG_API_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          const igId = igData.instagram_business_account.id;
          console.log(`      ✅ IG Business Account ID: ${igId}`);
          
          if (igId === userId) {
            console.log(`      ✅ COCOK dengan IG_USER_ID di .env.local!`);
          } else {
            console.log(`      ⚠️  TIDAK COCOK! .env.local punya: ${userId}`);
            console.log(`      💡 Ganti IG_USER_ID di .env.local menjadi: ${igId}`);
          }

          // Test 4: Cek info IG account
          const igInfoRes = await fetch(
            `${IG_API_BASE}/${igId}?fields=name,username,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
          );
          const igInfo = await igInfoRes.json();
          if (igInfo.username) {
            console.log(`\n      👤 Username : @${igInfo.username}`);
            console.log(`      📊 Followers: ${igInfo.followers_count}`);
            console.log(`      📸 Posts    : ${igInfo.media_count}`);
          }
        } else {
          console.log(`      ❌ Tidak ada IG Business Account terhubung ke page ini`);
          console.log(`      💡 Hubungkan Instagram Business/Creator ke Facebook Page ini`);
        }
        console.log();
      }
    } else {
      console.log(`   ❌ Tidak ada Facebook Page yang terhubung`);
      console.log(`   💡 Pastikan access token punya permission 'pages_show_list'`);
      if (pagesData.error) {
        console.log(`   Error: ${pagesData.error.message}`);
      }
      console.log();
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }

  // Test 5: Coba langsung akses IG_USER_ID yang di .env.local
  console.log(`🎯 Test 3: Coba akses langsung IG_USER_ID (${userId})...`);
  try {
    const directRes = await fetch(
      `${IG_API_BASE}/${userId}?fields=id,name,username&access_token=${accessToken}`
    );
    const directData = await directRes.json();

    if (directData.error) {
      console.log(`   ❌ Gagal: ${directData.error.message}`);
      console.log(`   💡 IG_USER_ID kemungkinan salah — gunakan ID dari test di atas`);
    } else {
      console.log(`   ✅ Berhasil akses!`);
      console.log(`   ID: ${directData.id}, Username: ${directData.username || directData.name}`);
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ Debug selesai!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
