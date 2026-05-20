"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthClient } from "@/lib/supabase/auth-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  // Supabase otomatis memproses token dari URL fragment (#access_token=...)
  // dan membuat session. Kita tunggu sampai session siap.
  useEffect(() => {
    const client = getAuthClient();

    // Listener untuk event SIGNED_IN atau PASSWORD_RECOVERY
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Cek session yang mungkin sudah ada
    client.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi password cocok
    if (password !== confirmPassword) {
      setError("Password tidak sama. Silakan periksa kembali.");
      return;
    }

    // Validasi panjang minimal
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const client = getAuthClient();

      const { error: updateError } = await client.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Berhasil update password
      setSuccess(true);

      // Redirect ke dashboard setelah 3 detik
      setTimeout(() => {
        router.replace("/");
      }, 3000);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Tampilkan loading saat mengecek session
  if (checking) {
    return (
      <div className="auth-loading">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {success ? (
          /* Tampilan setelah password berhasil diubah */
          <div className="reset-success">
            <div className="reset-success-icon reset-success-icon--check">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="reset-success-title">Password Berhasil Diubah!</h2>
            <p className="reset-success-text">
              Password kamu sudah diperbarui. Kamu akan diarahkan ke dashboard
              dalam beberapa detik...
            </p>
            <Link href="/" className="login-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              Ke Dashboard
            </Link>
          </div>
        ) : !sessionReady ? (
          /* Session tidak valid — link kedaluwarsa atau salah */
          <div className="reset-success">
            <div className="reset-success-icon reset-success-icon--warning">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="reset-success-title">Link Tidak Valid</h2>
            <p className="reset-success-text">
              Link reset password sudah kedaluwarsa atau tidak valid. Silakan
              kirim ulang permintaan reset password.
            </p>
            <div className="reset-actions">
              <Link
                href="/forgot-password"
                className="login-btn"
                style={{ display: "block", textAlign: "center", textDecoration: "none" }}
              >
                Kirim Ulang Link
              </Link>
              <Link href="/login" className="reset-back-link">
                ← Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          /* Form reset password */
          <>
            <div className="login-header">
              <h1 className="login-title">Reset Password</h1>
              <p className="login-subtitle">
                Masukkan password baru untuk akun kamu
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  Password Baru
                </label>
                <input
                  id="new-password"
                  className="form-input"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">
                  Konfirmasi Password
                </label>
                <input
                  id="confirm-password"
                  className="form-input"
                  type="password"
                  placeholder="Ketik ulang password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {/* Indikator kekuatan password */}
              {password.length > 0 && (
                <div className="password-strength">
                  <div className="password-strength-bar">
                    <div
                      className={`password-strength-fill ${
                        password.length >= 12
                          ? "strong"
                          : password.length >= 8
                          ? "medium"
                          : "weak"
                      }`}
                      style={{
                        width:
                          password.length >= 12
                            ? "100%"
                            : password.length >= 8
                            ? "66%"
                            : "33%",
                      }}
                    />
                  </div>
                  <span className="password-strength-label">
                    {password.length >= 12
                      ? "Kuat"
                      : password.length >= 8
                      ? "Sedang"
                      : "Lemah"}
                  </span>
                </div>
              )}

              {/* Indicator password match */}
              {confirmPassword.length > 0 && (
                <div
                  className={`password-match ${
                    password === confirmPassword ? "match" : "no-match"
                  }`}
                >
                  {password === confirmPassword
                    ? "✓ Password cocok"
                    : "✗ Password tidak sama"}
                </div>
              )}

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan Password Baru"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
