"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/supabase/auth-client";
import { useTheme } from "@/lib/use-theme";
import {
  LayoutDashboard, CalendarDays, Activity, Settings,
  Search, Plus, Aperture, Edit2, Trash2,
  Image as ImageIcon, Video, CheckCircle2, XCircle,
  Clock, LogOut, ChevronDown, Menu, X, Sun, Moon
} from "lucide-react";

// --- Types ---

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

interface PostLog {
  id: string;
  schedule_id: string;
  action: string;
  status: "success" | "error";
  message: string | null;
  created_at: string;
}

type Tab = "schedules" | "logs" | "gallery";

interface GalleryItem {
  id: string;
  media_url: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL";
  caption: string;
  user_email: string | null;
  status: string;
  scheduled_at: string;
  created_at: string;
}

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function IconUpload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

// --- Schedule Form Modal (Create Only — with file upload) ---

function CreateScheduleModal({
  userEmail,
  onClose,
  onSaved,
}: {
  userEmail: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Validasi tipe
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setError("File harus berupa gambar atau video");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Pilih file untuk diupload");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress("Mengupload file ke Google Drive...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption);
      formData.append("scheduled_at", new Date(scheduledAt).toISOString());
      formData.append("user_email", userEmail);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengupload file");
      }

      setUploadProgress("");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
      setUploadProgress("");
    } finally {
      setLoading(false);
    }
  };

  const detectedType = selectedFile
    ? selectedFile.type.startsWith("video/")
      ? "VIDEO"
      : "IMAGE"
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Buat Jadwal Baru</h2>

        <form onSubmit={handleSubmit}>
          {/* File Upload Area */}
          <div className="form-group">
            <label className="form-label">Upload Media</label>
            <div
              className={`upload-zone ${selectedFile ? "has-file" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="upload-preview">
                  <div className="upload-preview-icon">
                    {detectedType === "VIDEO" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    ) : (
                      <IconCamera />
                    )}
                  </div>
                  <div className="upload-preview-info">
                    <span className="upload-preview-name">{selectedFile.name}</span>
                    <span className="upload-preview-meta">
                      {formatFileSize(selectedFile.size)} · {detectedType}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="upload-preview-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-placeholder-icon">
                    <IconUpload />
                  </div>
                  <span className="upload-placeholder-text">
                    Klik atau drag & drop file di sini
                  </span>
                  <span className="upload-placeholder-hint">
                    Gambar (JPG, PNG) atau Video (MP4, MOV)
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-caption">
              Caption
            </label>
            <textarea
              id="modal-caption"
              className="form-textarea"
              placeholder="Tulis caption posting..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
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
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          {uploadProgress && (
            <div className="upload-progress">
              <span className="spinner" />
              <span>{uploadProgress}</span>
            </div>
          )}

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
                  <span className="spinner" /> Mengupload...
                </>
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

// --- Edit Schedule Modal (existing — JSON-based, no file upload) ---

function EditScheduleModal({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: Schedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    caption: schedule.caption,
    scheduled_at: toLocalDatetime(schedule.scheduled_at),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: form.caption,
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
        <h2 className="modal-title">Edit Jadwal</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Media</label>
            <div className="form-static">
              <span className="media-badge">{schedule.media_type}</span>
              <span className="form-hint" style={{ marginTop: 0, marginLeft: 8 }}>
                File ID: {schedule.gdrive_file_id}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-caption">
              Caption
            </label>
            <textarea
              id="edit-caption"
              className="form-textarea"
              placeholder="Tulis caption posting..."
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-scheduled-at">
              Jadwal Posting
            </label>
            <input
              id="edit-scheduled-at"
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
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Sidebar Component ---

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`dashboard-sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Aperture style={{ width: 20, height: 20, color: "white" }} />
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 18 }}>AutoPost OS</span>
          </div>
          {/* Close button — visible only on mobile/tablet */}
          <button
            className="hamburger-btn"
            onClick={onClose}
            aria-label="Tutup sidebar"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        {/* Nav */}
        <nav style={{ padding: "0 16px", flex: 1 }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 8, marginLeft: 8 }}>Core</p>
          <a href="/" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--accent-green-light)", color: "var(--text-primary)", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>
            <LayoutDashboard style={{ width: 16, height: 16 }} /> Dashboard
          </a>
          <a href="/jadwal-posting" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", color: "var(--text-tertiary)", textDecoration: "none", fontSize: 14, marginTop: 4 }}>
            <CalendarDays style={{ width: 16, height: 16 }} /> Jadwal Posting
          </a>
          <a href="/log-aktivitas" onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", color: "var(--text-tertiary)", textDecoration: "none", fontSize: 14, marginTop: 4 }}>
            <Activity style={{ width: 16, height: 16 }} /> Log Aktivitas
          </a>
        </nav>
      </aside>
    </>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [tab, setTab] = useState<Tab>("schedules");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme } = useTheme();

  // Auth guard — juga ambil email
  useEffect(() => {
    const client = getAuthClient();
    client.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setUserEmail(data.session.user.email ?? "");
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

  // Fetch gallery items
  const fetchGallery = useCallback(async (filter?: "ALL" | "IMAGE" | "VIDEO") => {
    setGalleryLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter && filter !== "ALL") {
        params.set("media_type", filter);
      }
      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();
      setGalleryItems(data.items || []);
    } catch {
      showToast("Gagal memuat galeri", "error");
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  // Load data
  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    Promise.all([fetchSchedules(), fetchLogs(), fetchGallery()]).finally(() =>
      setLoading(false)
    );
  }, [authChecked, fetchSchedules, fetchLogs, fetchGallery]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authChecked) return;
    const interval = setInterval(() => {
      fetchSchedules();
      fetchLogs();
      fetchGallery(galleryFilter);
    }, 30000);
    return () => clearInterval(interval);
  }, [authChecked, fetchSchedules, fetchLogs, fetchGallery, galleryFilter]);

  // Re-fetch gallery saat filter berubah
  useEffect(() => {
    if (!authChecked) return;
    fetchGallery(galleryFilter);
  }, [galleryFilter, authChecked, fetchGallery]);

  // Navigasi lightbox: item sebelumnya / berikutnya
  const navigateLightbox = useCallback((direction: "prev" | "next") => {
    if (!lightboxItem) return;
    const currentIndex = galleryItems.findIndex((item) => item.id === lightboxItem.id);
    if (currentIndex === -1) return;
    const newIndex = direction === "prev"
      ? (currentIndex - 1 + galleryItems.length) % galleryItems.length
      : (currentIndex + 1) % galleryItems.length;
    setLightboxItem(galleryItems[newIndex]);
  }, [lightboxItem, galleryItems]);

  // Keyboard navigation untuk lightbox
  useEffect(() => {
    if (!lightboxItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxItem(null);
      if (e.key === "ArrowLeft") navigateLightbox("prev");
      if (e.key === "ArrowRight") navigateLightbox("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxItem, navigateLightbox]);

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
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-secondary)", position: "relative" }}>
      {/* Background decoration */}
      <div style={{ position: "fixed", bottom: -192, right: -192, width: 384, height: 384, background: "rgba(99,102,241,0.1)", filter: "blur(120px)", borderRadius: "50%", pointerEvents: "none" }} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <header className="dashboard-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka menu"
        >
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
            <div className="header-avatar">
              {(userEmail?.[0] || "A").toUpperCase()}
            </div>
            <div className="header-user-info">
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1 }}>{userEmail || "user"}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Admin</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Platform Overview</h1>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginTop: 4 }}>
              Sistem Otomatis untuk Menjadwalkan dan Memposting Konten Instagram.
            </p>
          </div>
          <div className="dashboard-title-actions">
            <button className="btn btn-secondary" onClick={handleLogout}>
              <LogOut style={{ width: 16, height: 16 }} /> Keluar
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}
              style={{ boxShadow: "0 0 12px rgba(79,70,229,0.3)" }}>
              <Plus style={{ width: 16, height: 16 }} /> Buat Jadwal
            </button>
          </div>
        </div>

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
        <button
          className={`tab ${tab === "gallery" ? "active" : ""}`}
          onClick={() => setTab("gallery")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, display: "inline-flex" }}><IconGallery /></span>
            Galeri Media
          </span>
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
                    <th>Email</th>
                    <th>Dijadwalkan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.filter((s) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return s.caption.toLowerCase().includes(q) || (s.user_email || "").toLowerCase().includes(q) || s.status.toLowerCase().includes(q) || s.media_type.toLowerCase().includes(q);
                  }).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="media-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {s.media_type === "VIDEO" ? <Video style={{ width: 14, height: 14 }} /> : <ImageIcon style={{ width: 14, height: 14 }} />}
                          {s.media_type}
                        </span>
                      </td>
                      <td className="caption-cell" title={s.caption}>
                        {s.caption}
                      </td>
                      <td className="email-cell" title={s.user_email || "—"}>
                        {s.user_email || "—"}
                      </td>
                      <td className="date-cell">
                        <div>{formatDate(s.scheduled_at)}</div>
                        <div style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                          {relativeTime(s.scheduled_at)}
                        </div>
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
                          <button
                            className="btn-icon edit"
                            title="Edit jadwal"
                            onClick={() => setEditingSchedule(s)}
                          >
                            <Edit2 style={{ width: 16, height: 16 }} />
                          </button>
                          <button
                            className="btn-icon danger"
                            title="Hapus jadwal"
                            onClick={() => handleDelete(s.id)}
                          >
                            <Trash2 style={{ width: 16, height: 16 }} />
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

      {/* Gallery Tab */}
      {tab === "gallery" && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">Galeri Media</h2>
              <p className="section-subtitle">
                Lihat semua foto dan video yang sudah diupload
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => fetchGallery(galleryFilter)}>
              Refresh
            </button>
          </div>

          {/* Filter tabs */}
          <div className="gallery-filters">
            {(["ALL", "IMAGE", "VIDEO"] as const).map((filter) => (
              <button
                key={filter}
                className={`gallery-filter-btn ${galleryFilter === filter ? "active" : ""}`}
                onClick={() => setGalleryFilter(filter)}
              >
                {filter === "ALL" ? "Semua" : filter === "IMAGE" ? "📷 Foto" : "🎬 Video"}
              </button>
            ))}
          </div>

          {/* Gallery grid */}
          <div className="gallery-container">
            {galleryLoading ? (
              <div className="table-empty">
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                Memuat galeri...
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="table-empty">
                <div className="gallery-empty-icon">
                  <IconGallery />
                </div>
                <div className="table-empty-icon">Belum ada media</div>
                Upload file saat membuat jadwal untuk mengisi galeri.
              </div>
            ) : (
              <div className="gallery-grid">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    className="gallery-card"
                    onClick={() => setLightboxItem(item)}
                  >
                    <div className="gallery-card-media">
                      {item.media_type === "VIDEO" ? (
                        <div className="gallery-video-thumb">
                          <video
                            src={item.media_url}
                            muted
                            preload="metadata"
                            playsInline
                          />
                          <div className="gallery-play-overlay">
                            <IconPlay />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.media_url}
                          alt={item.caption}
                          loading="lazy"
                        />
                      )}
                      <div className="gallery-card-overlay">
                        <span className={`status-badge ${item.status}`}>
                          <span className="status-indicator" />
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="gallery-card-info">
                      <p className="gallery-card-caption">{item.caption}</p>
                      <div className="gallery-card-meta">
                        <span className="gallery-card-user">
                          <IconUser /> {item.user_email || "Anonim"}
                        </span>
                        <span className="gallery-card-date">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="lightbox-overlay" onClick={() => setLightboxItem(null)}>
          <button className="lightbox-close" onClick={() => setLightboxItem(null)}>
            <IconClose />
          </button>

          {galleryItems.length > 1 && (
            <>
              <button
                className="lightbox-nav lightbox-nav-prev"
                onClick={(e) => { e.stopPropagation(); navigateLightbox("prev"); }}
              >
                <IconChevronLeft />
              </button>
              <button
                className="lightbox-nav lightbox-nav-next"
                onClick={(e) => { e.stopPropagation(); navigateLightbox("next"); }}
              >
                <IconChevronRight />
              </button>
            </>
          )}

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-media">
              {lightboxItem.media_type === "VIDEO" ? (
                <video
                  src={lightboxItem.media_url}
                  controls
                  autoPlay
                  playsInline
                  style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "var(--radius-lg)" }}
                />
              ) : (
                <img
                  src={lightboxItem.media_url}
                  alt={lightboxItem.caption}
                  style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "var(--radius-lg)" }}
                />
              )}
            </div>
            <div className="lightbox-details">
              <div className="lightbox-caption">{lightboxItem.caption}</div>
              <div className="lightbox-meta">
                <span className="lightbox-meta-item">
                  <IconUser />
                  <span>{lightboxItem.user_email || "Anonim"}</span>
                </span>
                <span className="lightbox-meta-item">
                  <span className="media-badge">{lightboxItem.media_type}</span>
                </span>
                <span className={`status-badge ${lightboxItem.status}`}>
                  <span className="status-indicator" />
                  {lightboxItem.status}
                </span>
                <span className="lightbox-meta-item lightbox-meta-date">
                  {formatDate(lightboxItem.scheduled_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateScheduleModal
          userEmail={userEmail}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            fetchSchedules();
            showToast("Jadwal berhasil dibuat", "success");
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSchedule && (
        <EditScheduleModal
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
      </main>
    </div>
  );
}
