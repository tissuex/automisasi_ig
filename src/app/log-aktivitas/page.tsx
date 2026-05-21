"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@/lib/supabase/auth-client";
import { useTheme } from "@/lib/use-theme";
import {
  LayoutDashboard, CalendarDays, Activity,
  Search, Aperture, LogOut, Menu, X,
  RefreshCw, Filter, CheckCircle2, XCircle, AlertTriangle,
  BarChart3, Sun, Moon
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

interface PostLog {
  id: string;
  schedule_id: string;
  action: string;
  status: "success" | "error";
  message: string | null;
  created_at: string;
}

type ChartPeriod = "daily" | "monthly" | "yearly";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24) return `${hours}j lalu`;
  return `${days}h lalu`;
}

// --- Chart data helpers ---

function buildDailyData(logs: PostLog[]) {
  const map = new Map<string, { success: number; error: number }>();

  // Last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { success: 0, error: 0 });
  }

  logs.forEach((log) => {
    const key = log.created_at.slice(0, 10);
    if (map.has(key)) {
      const entry = map.get(key)!;
      if (log.status === "success") entry.success++;
      else entry.error++;
    }
  });

  const labels: string[] = [];
  const success: number[] = [];
  const error: number[] = [];

  map.forEach((val, key) => {
    const d = new Date(key);
    labels.push(d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }));
    success.push(val.success);
    error.push(val.error);
  });

  return { labels, success, error };
}

function buildMonthlyData(logs: PostLog[]) {
  const map = new Map<string, { success: number; error: number }>();

  // Last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { success: 0, error: 0 });
  }

  logs.forEach((log) => {
    const d = new Date(log.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) {
      const entry = map.get(key)!;
      if (log.status === "success") entry.success++;
      else entry.error++;
    }
  });

  const labels: string[] = [];
  const success: number[] = [];
  const error: number[] = [];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  map.forEach((val, key) => {
    const [year, month] = key.split("-");
    labels.push(`${monthNames[parseInt(month) - 1]} ${year}`);
    success.push(val.success);
    error.push(val.error);
  });

  return { labels, success, error };
}

function buildYearlyData(logs: PostLog[]) {
  const map = new Map<string, { success: number; error: number }>();

  // Last 5 years
  const currentYear = new Date().getFullYear();
  for (let i = 4; i >= 0; i--) {
    map.set(String(currentYear - i), { success: 0, error: 0 });
  }

  logs.forEach((log) => {
    const year = String(new Date(log.created_at).getFullYear());
    if (map.has(year)) {
      const entry = map.get(year)!;
      if (log.status === "success") entry.success++;
      else entry.error++;
    }
  });

  const labels: string[] = [];
  const success: number[] = [];
  const error: number[] = [];

  map.forEach((val, key) => {
    labels.push(key);
    success.push(val.success);
    error.push(val.error);
  });

  return { labels, success, error };
}

// --- Activity Chart Component ---

function ActivityChart({ logs, period }: { logs: PostLog[]; period: ChartPeriod }) {
  const chartData = useMemo(() => {
    if (period === "daily") return buildDailyData(logs);
    if (period === "monthly") return buildMonthlyData(logs);
    return buildYearlyData(logs);
  }, [logs, period]);

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Sukses",
        data: chartData.success,
        borderColor: "#34d399",
        backgroundColor: "rgba(52, 211, 153, 0.08)",
        pointBackgroundColor: "#34d399",
        pointBorderColor: "#34d399",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#34d399",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
      },
      {
        label: "Error",
        data: chartData.error,
        borderColor: "#fb7185",
        backgroundColor: "rgba(251, 113, 133, 0.06)",
        pointBackgroundColor: "#fb7185",
        pointBorderColor: "#fb7185",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#fb7185",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: "#94a3b8",
          font: { size: 12, family: "Inter, sans-serif" },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "rgba(19, 19, 22, 0.95)",
        titleColor: "#e2e8f0",
        bodyColor: "#94a3b8",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 600 as const, family: "Inter, sans-serif" },
        bodyFont: { size: 12, family: "Inter, sans-serif" },
        displayColors: true,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(148, 163, 184, 0.06)",
          drawTicks: false,
        },
        ticks: {
          color: "#64748b",
          font: { size: 11, family: "Inter, sans-serif" },
          padding: 8,
          maxRotation: 45,
          minRotation: 0,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(148, 163, 184, 0.06)",
          drawTicks: false,
        },
        ticks: {
          color: "#64748b",
          font: { size: 11, family: "Inter, sans-serif" },
          padding: 12,
          stepSize: 1,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div style={{ height: 320, position: "relative" }}>
      <Line data={data} options={options} />
    </div>
  );
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

// --- Main Page ---
export default function LogAktivitasPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const client = getAuthClient();
    client.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/login"); }
      else { setUserEmail(data.session.user.email ?? ""); setAuthChecked(true); }
    });
  }, [router]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=500");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { showToast("Gagal memuat log", "error"); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  }, [authChecked, fetchLogs]);

  useEffect(() => {
    if (!authChecked) return;
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [authChecked, fetchLogs]);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
    showToast("Log berhasil diperbarui", "success");
  };

  const handleLogout = async () => {
    const client = getAuthClient();
    await client.auth.signOut();
    router.replace("/login");
  };

  const filtered = logs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return log.action.toLowerCase().includes(q) || (log.message || "").toLowerCase().includes(q) || log.schedule_id.toLowerCase().includes(q);
  });

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;

  if (!authChecked) return <div className="auth-loading"><span className="spinner" /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-secondary)", position: "relative" }}>
      <div style={{ position: "fixed", bottom: -192, right: -192, width: 384, height: 384, background: "rgba(99,102,241,0.1)", filter: "blur(120px)", borderRadius: "50%", pointerEvents: "none" }} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePath="/log-aktivitas" />

      {/* Header */}
      <header className="dashboard-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
          <Menu style={{ width: 20, height: 20 }} />
        </button>
        <div className="header-search">
          <div className="header-search-inner">
            <Search style={{ width: 16, height: 16, position: "absolute", left: 12, color: "var(--text-tertiary)" }} />
            <input type="text" placeholder="Cari log, action, pesan..." className="header-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Log Aktivitas</h1>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginTop: 4 }}>Riwayat proses posting otomatis (auto-refresh 30 detik).</p>
          </div>
          <div className="dashboard-title-actions">
            <button className="btn btn-secondary" onClick={handleLogout}><LogOut style={{ width: 16, height: 16 }} /> Keluar</button>
            <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing} style={{ boxShadow: "0 0 12px rgba(79,70,229,0.3)" }}>
              <RefreshCw style={{ width: 16, height: 16, animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="log-stats-row">
          <div className="log-stat-card">
            <div className="log-stat-icon" style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
              <Activity style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div className="stat-label">Total Log</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{logs.length}</div>
            </div>
          </div>
          <div className="log-stat-card">
            <div className="log-stat-icon" style={{ background: "var(--status-success-bg)", color: "var(--status-success)" }}>
              <CheckCircle2 style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div className="stat-label">Sukses</div>
              <div className="stat-value posted" style={{ fontSize: 22 }}>{successCount}</div>
            </div>
          </div>
          <div className="log-stat-card">
            <div className="log-stat-icon" style={{ background: "var(--status-error-bg)", color: "var(--status-error)" }}>
              <XCircle style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div className="stat-label">Error</div>
              <div className="stat-value failed" style={{ fontSize: 22 }}>{errorCount}</div>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title-group">
              <BarChart3 style={{ width: 18, height: 18, color: "#818cf8" }} />
              <div>
                <h2 className="chart-card-title">Statistik Aktivitas</h2>
                <p className="chart-card-subtitle">
                  {chartPeriod === "daily" && "Upload aktivitas 14 hari terakhir"}
                  {chartPeriod === "monthly" && "Upload aktivitas 12 bulan terakhir"}
                  {chartPeriod === "yearly" && "Upload aktivitas 5 tahun terakhir"}
                </p>
              </div>
            </div>
            <div className="chart-period-tabs">
              {(["daily", "monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  className={`chart-period-btn ${chartPeriod === p ? "active" : ""}`}
                  onClick={() => setChartPeriod(p)}
                >
                  {p === "daily" ? "Harian" : p === "monthly" ? "Bulanan" : "Tahunan"}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-card-body">
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
                <span className="spinner" />
              </div>
            ) : (
              <ActivityChart logs={logs} period={chartPeriod} />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="schedule-filters">
          <div className="schedule-filter-group">
            <Filter style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
            {(["all", "success", "error"] as const).map((s) => (
              <button key={s} className={`gallery-filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "Semua" : s === "success" ? "✓ Sukses" : "✗ Error"}
              </button>
            ))}
          </div>
        </div>

        {/* Log list */}
        <div className="table-container">
          {loading ? (
            <div className="table-empty"><div className="spinner" style={{ margin: "0 auto 12px" }} />Memuat log...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div style={{ width: 48, height: 48, margin: "0 auto 12px", color: "var(--text-tertiary)", opacity: 0.4 }}>
                <AlertTriangle style={{ width: "100%", height: "100%" }} />
              </div>
              <div className="table-empty-icon">{searchQuery || statusFilter !== "all" ? "Tidak ada hasil" : "Belum ada log"}</div>
              {searchQuery || statusFilter !== "all" ? "Coba ubah filter atau kata kunci pencarian." : "Log akan muncul setelah cron berjalan."}
            </div>
          ) : (
            <div className="log-list">
              {filtered.map((log) => (
                <div key={log.id} className="log-item">
                  <span className={`status-badge ${log.status}`}>
                    <span className="status-indicator" />
                    {log.status}
                  </span>
                  <span className="log-action">{log.action}</span>
                  <span className="log-message">{log.message || "—"}</span>
                  <div className="log-time-group">
                    <span className="log-time">{formatDate(log.created_at)}</span>
                    <span className="log-time-relative">{relativeTime(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-tertiary)" }}>
            Menampilkan {filtered.length} dari {logs.length} log
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  );
}
