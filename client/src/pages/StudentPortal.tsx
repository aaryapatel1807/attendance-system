import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, GraduationCap, ScanFace, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppSelector } from "../store";
import { http } from "../api/http";
import type { PortalAttendance, PortalProfile } from "../types";
import {
  Avatar,
  Badge,
  Card,
  ChartTooltip,
  EmptyState,
  PageHeader,
  ProgressRing,
  Skeleton,
  StatCard,
} from "../components/ui";
import { cn } from "../utils/cn";

export default function StudentPortal() {
  const { user } = useAppSelector((s) => s.auth);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [attendance, setAttendance] = useState<PortalAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      http.get<PortalProfile>("/portal/me").then((r) => r.data).catch(() => null),
      http.get<PortalAttendance>("/portal/attendance").then((r) => r.data).catch(() => null),
    ]).then(([p, a]) => {
      setProfile(p);
      setAttendance(a);
      setLoading(false);
    });
  }, []);

  const firstName = (profile?.name ?? user?.name ?? "Student").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const chartData = (attendance?.history ?? [])
    .slice(-14)
    .map((h) => ({ date: h.date.slice(5), present: h.status === "present" ? 1 : 0, subject: h.subject }));

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${firstName} 👋`}
        subtitle={`${today} · Here's your attendance at a glance`}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Skeleton className="h-[380px] !rounded-[24px]" />
          <Skeleton className="h-[380px] !rounded-[24px] xl:col-span-2" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Attendance" value={attendance?.percent ?? 0} decimals={1} suffix="%" icon={GraduationCap} iconBg="grad-brand" delay={0.02} />
            <StatCard title="Present" value={attendance?.present ?? 0} icon={CheckCircle2} iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" delay={0.06} />
            <StatCard title="Absent" value={attendance?.absent ?? 0} icon={XCircle} iconBg="bg-gradient-to-br from-rose-500 to-red-600" delay={0.1} />
            <StatCard title="Sessions" value={attendance?.total ?? 0} icon={CalendarDays} iconBg="bg-gradient-to-br from-amber-500 to-orange-600" delay={0.14} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Profile card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="relative overflow-hidden p-7 text-center">
                <div className="grad-brand absolute inset-x-0 top-0 h-24 opacity-90" />
                <div className="relative mx-auto mt-8 w-fit">
                  <Avatar name={profile?.name ?? "?"} photo={profile?.photo} size={110} className="ring-4 ring-white dark:ring-night-850" />
                  {profile?.faceRegistered && (
                    <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white ring-4 ring-white dark:ring-night-850" title="Face registered">
                      <ScanFace size={18} />
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">{profile?.name}</h2>
                <p className="text-sm font-medium text-gray-400">{profile?.rollNumber}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge tone={profile?.faceRegistered ? "success" : "warning"}>
                    {profile?.faceRegistered ? "Face registered" : "No face data"}
                  </Badge>
                  <Badge tone="brand">{profile?.department}</Badge>
                  <Badge tone="info">Semester {profile?.semester}</Badge>
                </div>
                <div className="mt-6 flex items-center justify-center gap-6">
                  <ProgressRing percent={attendance?.percent ?? 0} size={120} />
                </div>
                <p className="mt-2 text-xs text-gray-400">Overall attendance</p>
              </Card>
            </motion.div>

            {/* Recent sessions chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="xl:col-span-2"
            >
              <Card className="flex h-full flex-col p-7">
                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Recent Sessions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {attendance ? `${attendance.present} present · ${attendance.absent} absent · ${attendance.total} sessions` : "Session summary"}
                </p>
                <div className="mt-4 h-[240px] flex-1">
                  {chartData.length === 0 ? (
                    <EmptyState icon={CalendarDays} title="No attendance yet" message="Your sessions will appear here once marked." />
                  ) : (
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
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}>
            <Card className="mt-5 p-7">
              <h3 className="mb-4 text-[18px] font-bold text-gray-900 dark:text-white">Attendance History</h3>
              {(attendance?.history ?? []).length === 0 ? (
                <EmptyState icon={CalendarDays} title="No attendance yet" message="Your history will appear here once marked." />
              ) : (
                <div className="relative">
                  {(attendance?.history ?? []).slice(0, 10).map((h, i, arr) => (
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
