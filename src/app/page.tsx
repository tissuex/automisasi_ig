"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { extractGDriveId } from "@/lib/gdrive/utils";
import { getAuthClient } from "@/lib/supabase/auth-client";

// --- Types ---

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

// --- SVG Icons ---

function IconCamera() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// --- Toast Component ---

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
      {message}
    </div>
  );
}

// --- Schedule Form Modal ---

function ScheduleModal({
  schedule,
  onClose,
  onSaved,
}: {
  schedule?: Schedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!schedule;

  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    gdrive_file_id: schedule?.gdrive_file_id ?? "",
    media_type: schedule?.media_type ?? "IMAGE",
    caption: schedule?.caption ?? "",
    scheduled_at: schedule ? toLocalDatetime(schedule.scheduled_at) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditing
        ? `/api/schedules/${schedule.id}`
        : "/api/schedules";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan jadwal");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {isEditing ? "Edit Jadwal" : "Buat Jadwal Baru"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="modal-gdrive">
              Google Drive File ID / URL
            </label>
            <input
              id="modal-gdrive"
              className="form-input"
              type="text"
              placeholder="Paste URL atau File ID"
              value={form.gdrive_file_id}
              onChange={(e) =>
                setForm({ ...form, gdrive_file_id: extractGDriveId(e.target.value) })
              }
              required
            />
            <p className="form-hint">
              Paste URL Google Drive — ID otomatis diekstrak
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-media-type">
              Tipe Media
            </label>
            <select
              id="modal-media-type"
              className="form-select"
              value={form.media_type}
              onChange={(e) =>
                setForm({ ...form, media_type: e.target.value as "IMAGE" | "VIDEO" | "CAROUSEL" })
              }
            >
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video / Reels</option>
              <option value="CAROUSEL">Carousel</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-caption">
              Caption
            </label>
            <textarea
              id="modal-caption"
              className="form-textarea"
              placeholder="Tulis caption posting..."
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-scheduled-at">
              Jadwal Posting
            </label>
            <input
              id="modal-scheduled-at"
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
              {error}
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
              ) : isEditing ? (
                "Simpan Perubahan"
              ) : (
                "Buat Jadwal"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("schedules");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Auth guard
  useEffect(() => {
    const client = getAuthClient();
    client.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

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
    if (!authChecked) return;
    setLoading(true);
    Promise.all([fetchSchedules(), fetchLogs()]).finally(() =>
      setLoading(false)
    );
  }, [authChecked, fetchSchedules, fetchLogs]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authChecked) return;
    const interval = setInterval(() => {
      fetchSchedules();
      fetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [authChecked, fetchSchedules, fetchLogs]);

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

  // Logout
  const handleLogout = async () => {
    const client = getAuthClient();
    await client.auth.signOut();
    router.replace("/login");
  };

  // Stats
  const stats = {
    total: schedules.length,
    pending: schedules.filter((s) => s.status === "pending").length,
    posted: schedules.filter((s) => s.status === "posted").length,
    failed: schedules.filter((s) => s.status === "failed").length,
  };

  if (!authChecked) {
    return (
      <div className="auth-loading">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div>
              <h1>Sistem Otomatis Posting Instagram</h1>
              <span className="sapaan">
                Selamat Datang, [Nama Pengguna]!
              </span>
              <span> Platform Otomatis untuk Menjadwalkan dan Memposting Konten Instagram</span>
            </div>
          </div>
          <div className="header-actions">
            <div className="header-status">
              <span className="status-dot" />
              System Active
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Keluar
            </button>
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
          Jadwal
        </button>
        <button
          className={`tab ${tab === "logs" ? "active" : ""}`}
          onClick={() => setTab("logs")}
        >
          Log Posting
        </button>
      </div>

      {/* Tab Content */}
      {tab === "schedules" && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">Daftar Jadwal Posting</h2>
              <p className="section-subtitle">
                Kelola jadwal auto-posting Instagram
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
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
                <div className="table-empty-icon">Belum ada data</div>
                Klik &quot;Buat Jadwal&quot; untuk mulai menjadwalkan posting.
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
                          {s.media_type}
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
                          <span className="status-indicator" />
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn-icon edit"
                            title="Edit jadwal"
                            onClick={() => setEditingSchedule(s)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            className="btn-icon danger"
                            title="Hapus jadwal"
                            onClick={() => handleDelete(s.id)}
                          >
                            <IconTrash />
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
              Refresh
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
                <div className="table-empty-icon">Belum ada log</div>
                Log akan muncul setelah cron berjalan.
              </div>
            ) : (
              <div className="log-list">
                {logs.map((log) => (
                  <div key={log.id} className="log-item">
                    <span className={`status-badge ${log.status}`}>
                      <span className="status-indicator" />
                      {log.status}
                    </span>
                    <span className="log-action">{log.action}</span>
                    <span className="log-message">
                      {log.message || "\u2014"}
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

      {/* Create Modal */}
      {showCreateModal && (
        <ScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            fetchSchedules();
            showToast("Jadwal berhasil dibuat", "success");
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSchedule && (
        <ScheduleModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSaved={() => {
            fetchSchedules();
            showToast("Jadwal berhasil diperbarui", "success");
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
