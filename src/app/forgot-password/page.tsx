"use client";

import { useState } from "react";
import Link from "next/link";
import { getAuthClient } from "@/lib/supabase/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const client = getAuthClient();

      // Kirim email reset password via Supabase Auth
      const { error: resetError } = await client.auth.resetPasswordForEmail(
        email,
        {
          // Redirect ke halaman reset-password setelah klik link di email
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      // Berhasil kirim email
      setSent(true);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Lupa Password?</h1>
          <p className="login-subtitle">
            Masukkan email untuk menerima link reset password
          </p>
        </div>

        {sent ? (
          /* Tampilan setelah email berhasil dikirim */
          <div className="reset-success">
            <div className="reset-success-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="reset-success-title">Email Terkirim!</h2>
            <p className="reset-success-text">
              Kami sudah mengirim link reset password ke{" "}
              <strong>{email}</strong>. Silakan cek inbox (dan folder spam)
              email kamu.
            </p>
            <p className="reset-success-hint">
              Link akan kedaluwarsa dalam 1 jam.
            </p>
            <div className="reset-actions">
              <button
                className="login-btn"
                style={{ background: "var(--bg-navy)" }}
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Kirim Ulang
              </button>
              <Link href="/login" className="reset-back-link">
                ← Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          /* Form input email */
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                className="form-input"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Mengirim...
                </span>
              ) : (
                "Kirim Link Reset"
              )}
            </button>

            <Link href="/login" className="reset-back-link">
              ← Kembali ke Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
