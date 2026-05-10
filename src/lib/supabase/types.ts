/**
 * Supabase Database Types
 * ========================
 * Type definitions untuk tabel `schedules` dan `post_logs`.
 * Mengikuti konvensi Supabase generated types.
 */

// ─── Enum Types ───────────────────────────────────────────────

/** Status jadwal posting */
export type ScheduleStatus = "pending" | "processing" | "posted" | "failed";

/** Tipe media Instagram */
export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL";

// ─── Table Row Types (convenience aliases) ────────────────────

/** Row dari tabel `schedules` */
export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];

/** Row dari tabel `post_logs` */
export type PostLog = Database["public"]["Tables"]["post_logs"]["Row"];

/** Insert type untuk `schedules` */
export type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];

/** Update type untuk `schedules` */
export type ScheduleUpdate = Database["public"]["Tables"]["schedules"]["Update"];

/** Insert type untuk `post_logs` */
export type PostLogInsert = Database["public"]["Tables"]["post_logs"]["Insert"];

// ─── Supabase Database Schema ─────────────────────────────────

/** Definisi lengkap schema database untuk Supabase client */
export interface Database {
  public: {
    Tables: {
      schedules: {
        Row: {
          id: string;
          gdrive_file_id: string;
          media_type: MediaType;
          caption: string;
          scheduled_at: string;
          status: ScheduleStatus;
          ig_post_id: string | null;
          user_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gdrive_file_id: string;
          media_type: MediaType;
          caption: string;
          scheduled_at: string;
          status?: ScheduleStatus;
          ig_post_id?: string | null;
          user_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gdrive_file_id?: string;
          media_type?: MediaType;
          caption?: string;
          scheduled_at?: string;
          status?: ScheduleStatus;
          ig_post_id?: string | null;
          user_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_logs: {
        Row: {
          id: string;
          schedule_id: string;
          action: string;
          status: "success" | "error";
          message: string | null;
          payload: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          action: string;
          status: "success" | "error";
          message?: string | null;
          payload?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          schedule_id?: string;
          action?: string;
          status?: "success" | "error";
          message?: string | null;
          payload?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_logs_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedules";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
