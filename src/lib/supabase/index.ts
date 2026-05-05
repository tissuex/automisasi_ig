/**
 * Supabase Module — Barrel Export
 * ================================
 * Satu entry point untuk semua Supabase utilities.
 *
 * Usage:
 *   import { supabase, getSupabaseAdmin, getSchedules, logSuccess } from "@/lib/supabase";
 */

// Client instances
export { supabase, getSupabaseAdmin } from "./client";

// Type definitions
export type {
  Database,
  Schedule,
  ScheduleInsert,
  ScheduleUpdate,
  ScheduleStatus,
  MediaType,
  PostLog,
  PostLogInsert,
} from "./types";

// Schedule queries (CRUD)
export {
  getSchedules,
  getScheduleById,
  getDueSchedules,
  createSchedule,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
} from "./schedules";

// Post log queries
export {
  createPostLog,
  logSuccess,
  logError,
  getPostLogs,
  getLogsByScheduleId,
} from "./post-logs";
