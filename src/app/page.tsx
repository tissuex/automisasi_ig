"use client";

import { useState, useEffect, useCallback } from "react";
import { extractGDriveId } from "@/lib/gdrive/utils";

// ─── Types ────────────────────────────────────────────────────

interface Schedule {
  id: string;
  gdrive_file_id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL";
  caption: string;
  scheduled_at: string;
  status: "pending" | "processing" | "posted" | "failed";
  ig_post_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PostLog {
  id: string;
  schedule_id: string;
  action: string;
  status: "success" | "error";
  message: string | null;
  created_at: string;
}

type Tab = "schedules" | "logs";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff > 0) {
    if (minutes < 1) return "sebentar lagi";
    if (minutes < 60) return `${minutes}m lagi`;
    if (hours < 24) return `${hours}j lagi`;
    return `${days}h lagi`;
  } else {
    if (minutes < 1) return "baru saja";
    if (minutes < 60) return `${minutes}m lalu`;
    if (hours < 24) return `${hours}j lalu`;
    return `${days}h lalu`;
  }
}

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  processing: "⚙️",
  posted: "✅",
  failed: "❌",
  success: "✅",
  error: "❌",
};

const MEDIA_ICONS: Record<string, string> = {
  IMAGE: "🖼️",
  VIDEO: "🎬",
  CAROUSEL: "📸",
};

// ─── Toast Component ──────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast ${type}`}>
      {type === "success" ? "✅" : "❌"} {message}
    </div>
  );
}

// ─── Create Schedule Modal ────────────────────────────────────

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    gdrive_file_id: "",
    media_type: "IMAGE",
    caption: "",
    scheduled_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat jadwal");
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">📅 Buat Jadwal Baru</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="gdrive_file_id">Google Drive File ID / URL</label>
            <input
              id="gdrive_file_id"
              className="form-input"
              type="text"
              placeholder="Paste URL atau File ID — otomatis diekstrak"
              value={form.gdrive_file_id}
              onChange={(e) =>
                setForm({ ...form, gdrive_file_id: extractGDriveId(e.target.value) })
              }
              required
            />
            <p className="form-hint">
              Paste langsung URL Google Drive (misal: https://drive.google.com/file/d/<strong>FILE_ID</strong>/view) — ID otomatis diekstrak
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="media_type">Tipe Media</label>
            <select
              id="media_type"
              className="form-select"
              value={form.media_type}
              onChange={(e) =>
                setForm({ ...form, media_type: e.target.value })
              }
            >
              <option value="IMAGE">🖼️ Image</option>
              <option value="VIDEO">🎬 Video / Reels</option>
              <option value="CAROUSEL">📸 Carousel</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="caption">Caption</label>
            <textarea
              id="caption"
              className="form-textarea"
              placeholder="Tulis caption posting..."
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="scheduled_at">Jadwal Posting</label>
            <input
              id="scheduled_at"
              className="form-input"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) =>
                setForm({ ...form, scheduled_at: e.target.value })
              }
              required
            />
          </div>

          {error && (
            <p style={{ color: "var(--status-failed)", fontSize: 13, marginBottom: 12 }}>
              ❌ {error}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Menyimpan...
                </>
              ) : (
                "📅 Buat Jadwal"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("schedules");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {
      showToast("Gagal memuat jadwal", "error");
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=100");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      showToast("Gagal memuat log", "error");
    }
  }, []);

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSchedules(), fetchLogs()]).finally(() =>
      setLoading(false)
    );
  }, [fetchSchedules, fetchLogs]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSchedules();
      fetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSchedules, fetchLogs]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // Delete schedule
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus jadwal ini?")) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");

      showToast("Jadwal berhasil dihapus", "success");
      fetchSchedules();
    } catch {
      showToast("Gagal menghapus jadwal", "error");
    }
  };

  // Stats
  const stats = {
    total: schedules.length,
    pending: schedules.filter((s) => s.status === "pending").length,
    posted: schedules.filter((s) => s.status === "posted").length,
    failed: schedules.filter((s) => s.status === "failed").length,
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📸</div>
            <div>
              <h1>IG Auto-Poster</h1>
              <span>Automated Instagram Scheduling</span>
            </div>
          </div>
          <div className="header-status">
            <span className="status-dot" />
            System Active
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Jadwal</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value pending">{stats.pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Posted</div>
          <div className="stat-value posted">{stats.posted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value failed">{stats.failed}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${tab === "schedules" ? "active" : ""}`}
          onClick={() => setTab("schedules")}
        >
          📅 Jadwal
        </button>
        <button
          className={`tab ${tab === "logs" ? "active" : ""}`}
          onClick={() => setTab("logs")}
        >
          📋 Log Posting
        </button>
      </div>

      {/* Tab Content */}
      {tab === "schedules" && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">Daftar Jadwal Posting</h2>
              <p className="section-subtitle">
                Kelola jadwal auto-posting Instagram kamu
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              + Buat Jadwal
            </button>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="table-empty">
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                Memuat data...
              </div>
            ) : schedules.length === 0 ? (
              <div className="table-empty">
                <div className="table-empty-icon">📭</div>
                Belum ada jadwal. Klik &quot;Buat Jadwal&quot; untuk mulai.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Media</th>
                    <th>Caption</th>
                    <th>Dijadwalkan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="media-badge">
                          {MEDIA_ICONS[s.media_type]} {s.media_type}
                        </span>
                      </td>
                      <td className="caption-cell" title={s.caption}>
                        {s.caption}
                      </td>
                      <td className="date-cell">
                        <div>{formatDate(s.scheduled_at)}</div>
                        <div style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                          {relativeTime(s.scheduled_at)}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${s.status}`}>
                          {STATUS_ICONS[s.status]} {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn-icon danger"
                            title="Hapus jadwal"
                            onClick={() => handleDelete(s.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === "logs" && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">Log Aktivitas</h2>
              <p className="section-subtitle">
                Riwayat proses posting (auto-refresh 30 detik)
              </p>
            </div>
            <button className="btn btn-secondary" onClick={fetchLogs}>
              🔄 Refresh
            </button>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="table-empty">
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                Memuat log...
              </div>
            ) : logs.length === 0 ? (
              <div className="table-empty">
                <div className="table-empty-icon">📭</div>
                Belum ada log. Log akan muncul setelah cron berjalan.
              </div>
            ) : (
              <div className="log-list">
                {logs.map((log) => (
                  <div key={log.id} className="log-item">
                    <span className={`status-badge ${log.status}`}>
                      {STATUS_ICONS[log.status]} {log.status}
                    </span>
                    <span className="log-action">{log.action}</span>
                    <span className="log-message">
                      {log.message || "—"}
                    </span>
                    <span className="log-time">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            fetchSchedules();
            showToast("Jadwal berhasil dibuat! 🎉", "success");
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
