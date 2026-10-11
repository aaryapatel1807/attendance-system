// Shared data shapes — mirrors ~/workspace/face-attendance/docs/CONTRACT.md

export type Role = "admin" | "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  semester: number;
  photo?: string;
  faceRegistered: boolean;
  attendancePercent?: number;
  lastAttendance?: string;
}

export interface AttendanceEntry {
  date: string;
  subject: string;
  status: "present" | "absent";
  time?: string;
}

export interface StudentDetail extends Student {
  attendanceHistory: AttendanceEntry[];
}

export interface StudentStats {
  percent: number;
  present: number;
  absent: number;
  total: number;
  history: AttendanceEntry[];
}

export interface PortalProfile {
  id: string;
  rollNumber: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  semester: number;
  photo?: string;
  faceRegistered: boolean;
}

export interface PortalAttendance extends StudentStats {}

export interface VerifyFaceResult {
  verified: boolean;
  confidence?: number;
  student?: { name: string; rollNumber: string; photo?: string };
  reason?: "no_face" | "no_match" | "not_you";
}

export interface PortalClass {
  id: string;
  name: string;
  subject: string;
  teacherName?: string | null;
  schedule?: string;
}

export interface EnrollFaceResult {
  success: boolean;
  faces_found: number;
}

export interface MarkAttendanceResult {
  marked: boolean;
  confidence?: number | null;
  subject?: string;
  reason?: "no_face" | "no_match" | "not_you";
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedClasses?: string[];
}

export interface Department {
  id: string;
  name: string;
}

export interface ClassItem {
  id: string;
  name: string;
  department: string;
  semester: number;
  subject: string;
  teacherId?: string;
  teacherName?: string;
  schedule?: string;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  recognitionAccuracy: number;
  weeklyTrend: { day: string; present: number; absent: number }[];
  departmentBars: { department: string; percent: number }[];
  todayDonut: { present: number; absent: number };
  recentActivity: { text: string; time: string; type: "success" | "warning" | "error" | "info" }[];
}

export interface FaceBox {
  bbox: [number, number, number, number];
}

export interface RecognizedMatch extends FaceBox {
  studentId: string;
  name: string;
  rollNumber: string;
  department: string;
  photo?: string;
  confidence: number;
}

export interface RecognizeResponse {
  matches: RecognizedMatch[];
  unknown: FaceBox[];
}

export interface AttendanceRecordPayload {
  classId: string;
  subject: string;
  date: string; // YYYY-MM-DD
  records: { studentId: string; status: "present" | "absent"; confidence?: number }[];
}

export interface HistoryRow {
  date: string;
  subject: string;
  present: number;
  absent: number;
  total: number;
}

export interface ReportData {
  summary: Record<string, number | string>;
  daily: { date: string; present: number; absent: number }[];
  byDepartment: { department: string; percent: number }[];
  bySubject: { subject: string; percent: number }[];
  heatmap: { date: string; percent: number }[];
}

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
