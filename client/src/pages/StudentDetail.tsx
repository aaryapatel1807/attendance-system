import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Mail, Phone, ScanFace } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppDispatch, useAppSelector } from "../store";
import { clearDetail, fetchStudentDetail } from "../store/slices/studentsSlice";
import { http } from "../api/http";
import type { StudentStats } from "../types";
import {
  Avatar,
  Badge,
  Card,
  ChartTooltip,
  EmptyState,
  PageHeader,
  ProgressRing,
  Skeleton,
} from "../components/ui";
import { cn } from "../utils/cn";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { detail } = useAppSelector((s) => s.students);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      dispatch(fetchStudentDetail(id)),
      http.get<StudentStats>(`/students/${id}/stats`).then((r) => r.data).catch(() => null),
    ]).then(([, s]) => {
      setStats(s);
      setLoading(false);
    });
    return () => {
      dispatch(clearDetail());
    };
  }, [dispatch, id]);

  const chartData = (stats?.history ?? detail?.attendanceHistory ?? [])
    .slice(-14)
    .map((h) => ({ date: h.date.slice(5), present: h.status === "present" ? 1 : 0, subject: h.subject }));

  return (
    <div>
      <PageHeader
        title="Student Profile"
        subtitle="Attendance record and face registration status"
        actions={
          <Link to="/students" className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-night-800 dark:text-gray-200 dark:hover:bg-night-700">
            <ArrowLeft size={16} /> Back to students
          </Link>
        }
      />

      {loading || !detail ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Skeleton className="h-[380px] !rounded-[24px]" />
          <Skeleton className="h-[380px] !rounded-[24px] xl:col-span-2" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Profile card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="relative overflow-hidden p-7 text-center">
                <div className="grad-brand absolute inset-x-0 top-0 h-24 opacity-90" />
                <div className="relative mx-auto mt-8 w-fit">
                  <Avatar name={detail.name} photo={detail.photo} size={110} className="ring-4 ring-white dark:ring-night-850" />
                  {detail.faceRegistered && (
                    <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-white dark:ring-night-850" title="Face registered">
                      <ScanFace size={18} />
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">{detail.name}</h2>
                <p className="text-sm font-medium text-gray-400">{detail.rollNumber}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <Badge tone={detail.faceRegistered ? "success" : "warning"}>
                    {detail.faceRegistered ? "Face registered" : "No face data"}
                  </Badge>
                  <Badge tone="brand">{detail.department}</Badge>
                </div>
                <div className="mt-6 space-y-3 text-left">
                  <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <Mail size={17} className="shrink-0 text-brand-600 dark:text-violet-300" />
                    <span className="truncate text-sm text-gray-700 dark:text-gray-200">{detail.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <Phone size={17} className="shrink-0 text-brand-600 dark:text-violet-300" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{detail.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    <CalendarDays size={17} className="shrink-0 text-brand-600 dark:text-violet-300" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      Semester {detail.semester} · Last seen {detail.lastAttendance ? new Date(detail.lastAttendance).toLocaleDateString() : "never"}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Stats + chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="xl:col-span-2"
            >
              <Card className="flex h-full flex-col p-7">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Attendance Overview</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stats ? `${stats.present} present · ${stats.absent} absent · ${stats.total} sessions` : "Session summary"}
                    </p>
                  </div>
                  <ProgressRing percent={stats?.percent ?? detail.attendancePercent ?? 0} size={110} />
                </div>
                <div className="mt-4 h-[220px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v: number) => (v === 1 ? "P" : "A")} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
                      <Bar dataKey="present" name="Status" radius={[8, 8, 4, 4]} maxBarSize={26}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={d.present ? "#22C55E" : "#EF4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}>
            <Card className="mt-5 p-7">
              <h3 className="mb-4 text-[18px] font-bold text-gray-900 dark:text-white">Attendance History</h3>
              {chartData.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No attendance yet" message="This student has no recorded sessions." />
              ) : (
                <div className="relative space-y-0">
                  {(stats?.history ?? detail.attendanceHistory).slice(-10).reverse().map((h, i, arr) => (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < arr.length - 1 && (
                        <span className="absolute left-[15px] top-9 h-[calc(100%-28px)] w-0.5 bg-gray-100 dark:bg-night-700" />
                      )}
                      <span className={cn(
                        "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                        h.status === "present" ? "bg-green-500" : "bg-red-400"
                      )}>
                        {h.status === "present" ? "P" : "A"}
                      </span>
                      <div className="flex flex-1 items-center justify-between rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-white/[0.04]">
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{h.subject}</p>
                          <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{h.time ? ` · ${h.time}` : ""}</p>
                        </div>
                        <Badge tone={h.status === "present" ? "success" : "danger"}>{h.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
