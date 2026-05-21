"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/supabase/auth-client";
import { useTheme } from "@/lib/use-theme";
import {
  LayoutDashboard, CalendarDays, Activity,
  Search, Plus, Aperture, Edit2, Trash2,
  Image as ImageIcon, Video, CheckCircle2, XCircle,
  Clock, LogOut, Menu, X, Filter, ArrowUpDown, Sun, Moon
} from "lucide-react";

interface Schedule {
  id: string;
  gdrive_file_id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL";
  caption: string;
  scheduled_at: string;
  status: "pending" | "processing" | "posted" | "failed";
  ig_post_id: string | null;
  user_email: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Sidebar ---
function Sidebar({ isOpen, onClose, activePath }: { isOpen: boolean; onClose: () => void; activePath: string }) {
  const linkStyle = (path: string) => ({
    display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
    background: activePath === path ? "var(--accent-green-light)" : "transparent",
    color: activePath === path ? "var(--text-primary)" : "var(--text-tertiary)",
    borderRadius: 8, textDecoration: "none", fontSize: 14, marginTop: path === "/" ? 0 : 4,
  });
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "visible" : ""}`} onClick={onClose} />
      <aside className={`dashboard-sidebar ${isOpen ? "open" : ""}`}>
        <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Aperture style={{ width: 20, height: 20, color: "white" }} />
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 18 }}>AutoPost OS</span>
          </div>
          <button className="hamburger-btn" onClick={onClose} aria-label="Tutup sidebar">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <nav style={{ padding: "0 16px", flex: 1 }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 8, marginLeft: 8 }}>Core</p>
          <a href="/" style={linkStyle("/")}><LayoutDashboard style={{ width: 16, height: 16 }} /> Dashboard</a>
          <a href="/jadwal-posting" style={linkStyle("/jadwal-posting")}><CalendarDays style={{ width: 16, height: 16 }} /> Jadwal Posting</a>
          <a href="/log-aktivitas" style={linkStyle("/log-aktivitas")}><Activity style={{ width: 16, height: 16 }} /> Log Aktivitas</a>
        </nav>
      </aside>
    </>
  );
}

// --- Toast ---
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

// --- Create Schedule Modal ---
function CreateScheduleModal({ userEmail, onClose, onSaved }: { userEmail: string; onClose: () => void; onSaved: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setError(""); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setError("File harus berupa gambar atau video"); return;
      }
      setSelectedFile(file); setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError("Pilih file untuk diupload"); return; }
    setLoading(true); setError(""); setUploadProgress("Mengupload file ke Google Drive...");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);
      formData.append("scheduled_at", new Date(scheduledAt).toISOString());
      formData.append("user_email", userEmail);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengupload file");
      setUploadProgress(""); onSaved(); onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message); setUploadProgress("");
    } finally { setLoading(false); }
  };

  const detectedType = selectedFile ? (selectedFile.type.startsWith("video/") ? "VIDEO" : "IMAGE") : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Buat Jadwal Baru</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Upload Media</label>
            <div className={`upload-zone ${selectedFile ? "has-file" : ""}`} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
              {selectedFile ? (
                <div className="upload-preview">
                  <div className="upload-preview-icon">
                    {detectedType === "VIDEO" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    )}
                  </div>
                  <div className="upload-preview-info">
                    <span className="upload-preview-name">{selectedFile.name}</span>
                    <span className="upload-preview-meta">{formatFileSize(selectedFile.size)} · {detectedType}</span>
                  </div>
                  <button type="button" className="upload-preview-remove" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>×</button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-placeholder-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  </div>
                  <span className="upload-placeholder-text">Klik atau drag & drop file di sini</span>
                  <span className="upload-placeholder-hint">Gambar (JPG, PNG) atau Video (MP4, MOV)</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display: "none" }} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="modal-caption">Caption</label>
            <textarea id="modal-caption" className="form-textarea" placeholder="Tulis caption posting..." value={caption} onChange={(e) => setCaption(e.target.value)} required rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="modal-scheduled-at">Jadwal Posting</label>
            <input id="modal-scheduled-at" className="form-input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
          </div>
          {uploadProgress && <div className="upload-progress"><span className="spinner" /><span>{uploadProgress}</span></div>}
          {error && <p style={{ color: "var(--status-failed)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? (<><span className="spinner" /> Mengupload...</>) : "Buat Jadwal"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Edit Schedule Modal ---
function EditScheduleModal({ schedule, onClose, onSaved }: { schedule: Schedule; onClose: () => void; onSaved: () => void }) {
  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso); const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({ caption: schedule.caption, scheduled_at: toLocalDatetime(schedule.scheduled_at) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: form.caption, scheduled_at: new Date(form.scheduled_at).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan jadwal");
      onSaved(); onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit Jadwal</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Media</label>
            <div className="form-static">
              <span className="media-badge">{schedule.media_type}</span>
              <span className="form-hint" style={{ marginTop: 0, marginLeft: 8 }}>File ID: {schedule.gdrive_file_id}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-caption">Caption</label>
            <textarea id="edit-caption" className="form-textarea" placeholder="Tulis caption posting..." value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} required rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-scheduled-at">Jadwal Posting</label>
            <input id="edit-scheduled-at" className="form-input" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} required />
          </div>
          {error && <p style={{ color: "var(--status-failed)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? (<><span className="spinner" /> Menyimpan...</>) : "Simpan Perubahan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function JadwalPostingPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "processing" | "posted" | "failed">("all");
  const [sortField, setSortField] = useState<"scheduled_at" | "created_at">("scheduled_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const client = getAuthClient();
    client.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/login"); }
      else { setUserEmail(data.session.user.email ?? ""); setAuthChecked(true); }
    });
  }, [router]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch { showToast("Gagal memuat jadwal", "error"); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    fetchSchedules().finally(() => setLoading(false));
  }, [authChecked, fetchSchedules]);

  useEffect(() => {
    if (!authChecked) return;
    const interval = setInterval(fetchSchedules, 30000);
    return () => clearInterval(interval);
  }, [authChecked, fetchSchedules]);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus jadwal ini?")) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      showToast("Jadwal berhasil dihapus", "success"); fetchSchedules();
    } catch { showToast("Gagal menghapus jadwal", "error"); }
  };

  const handleLogout = async () => {
    const client = getAuthClient();
    await client.auth.signOut();
    router.replace("/login");
  };

  // Filter & sort
  const filtered = schedules
    .filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return s.caption.toLowerCase().includes(q) || (s.user_email || "").toLowerCase().includes(q) || s.media_type.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aVal = new Date(a[sortField]).getTime();
      const bVal = new Date(b[sortField]).getTime();
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

  const stats = {
    total: schedules.length,
    pending: schedules.filter((s) => s.status === "pending").length,
    posted: schedules.filter((s) => s.status === "posted").length,
    failed: schedules.filter((s) => s.status === "failed").length,
  };

  if (!authChecked) return <div className="auth-loading"><span className="spinner" /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-secondary)", position: "relative" }}>
      <div style={{ position: "fixed", bottom: -192, right: -192, width: 384, height: 384, background: "rgba(99,102,241,0.1)", filter: "blur(120px)", borderRadius: "50%", pointerEvents: "none" }} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePath="/jadwal-posting" />

      {/* Header */}
      <header className="dashboard-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
          <Menu style={{ width: 20, height: 20 }} />
        </button>
        <div className="header-search">
          <div className="header-search-inner">
            <Search style={{ width: 16, height: 16, position: "absolute", left: 12, color: "var(--text-tertiary)" }} />
            <input type="text" placeholder="Cari jadwal, caption, email..." className="header-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="header-search-clear" onClick={() => setSearchQuery("")}><X style={{ width: 14, height: 14 }} /></button>}
          </div>
        </div>
        <div className="header-right">
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Ganti tema" title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}>
            {theme === "dark" ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
          </button>
          <div className="header-avatar-group">
            <div className="header-avatar">{(userEmail?.[0] || "A").toUpperCase()}</div>
            <div className="header-user-info">
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1 }}>{userEmail || "user"}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Admin</div>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Title */}
        <div className="dashboard-title-row">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Jadwal Posting</h1>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginTop: 4 }}>Kelola semua jadwal auto-posting Instagram Anda.</p>
          </div>
          <div className="dashboard-title-actions">
            <button className="btn btn-secondary" onClick={handleLogout}><LogOut style={{ width: 16, height: 16 }} /> Keluar</button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ boxShadow: "0 0 12px rgba(79,70,229,0.3)" }}>
              <Plus style={{ width: 16, height: 16 }} /> Buat Jadwal
            </button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Jadwal</div><div className="stat-value">{stats.total}</div></div>
          <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value pending">{stats.pending}</div></div>
          <div className="stat-card"><div className="stat-label">Posted</div><div className="stat-value posted">{stats.posted}</div></div>
          <div className="stat-card"><div className="stat-label">Failed</div><div className="stat-value failed">{stats.failed}</div></div>
        </div>

        {/* Filters */}
        <div className="schedule-filters">
          <div className="schedule-filter-group">
            <Filter style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
            {(["all", "pending", "processing", "posted", "failed"] as const).map((s) => (
              <button key={s} className={`gallery-filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "Semua" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
            <ArrowUpDown style={{ width: 14, height: 14 }} />
            {sortField === "scheduled_at" ? "Jadwal" : "Dibuat"} {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="table-empty"><div className="spinner" style={{ margin: "0 auto 12px" }} />Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon">{searchQuery || statusFilter !== "all" ? "Tidak ada hasil" : "Belum ada data"}</div>
              {searchQuery || statusFilter !== "all" ? "Coba ubah filter atau kata kunci pencarian." : "Klik \"Buat Jadwal\" untuk mulai menjadwalkan posting."}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Media</th><th>Caption</th><th>Email</th><th>Dijadwalkan</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="media-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {s.media_type === "VIDEO" ? <Video style={{ width: 14, height: 14 }} /> : <ImageIcon style={{ width: 14, height: 14 }} />}
                        {s.media_type}
                      </span>
                    </td>
                    <td className="caption-cell" title={s.caption}>{s.caption}</td>
                    <td className="email-cell" title={s.user_email || "—"}>{s.user_email || "—"}</td>
                    <td className="date-cell">
                      <div>{formatDate(s.scheduled_at)}</div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{relativeTime(s.scheduled_at)}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${s.status}`}>
                        {s.status === "posted" && <CheckCircle2 style={{ width: 14, height: 14 }} />}
                        {s.status === "failed" && <XCircle style={{ width: 14, height: 14 }} />}
                        {(s.status === "pending" || s.status === "processing") && <Clock style={{ width: 14, height: 14 }} />}
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon edit" title="Edit jadwal" onClick={() => setEditingSchedule(s)}><Edit2 style={{ width: 16, height: 16 }} /></button>
                        <button className="btn-icon danger" title="Hapus jadwal" onClick={() => handleDelete(s.id)}><Trash2 style={{ width: 16, height: 16 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Results count */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-tertiary)" }}>
            Menampilkan {filtered.length} dari {schedules.length} jadwal
          </div>
        )}

        {showCreateModal && (
          <CreateScheduleModal userEmail={userEmail} onClose={() => setShowCreateModal(false)} onSaved={() => { fetchSchedules(); showToast("Jadwal berhasil dibuat", "success"); }} />
        )}
        {editingSchedule && (
          <EditScheduleModal schedule={editingSchedule} onClose={() => setEditingSchedule(null)} onSaved={() => { fetchSchedules(); showToast("Jadwal berhasil diperbarui", "success"); }} />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  );
}
