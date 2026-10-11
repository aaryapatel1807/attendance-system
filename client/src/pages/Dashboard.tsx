import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  CircleCheck,
  FileUp,
  ScanFace,
  Sparkles,
  Target,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchStats } from "../store/slices/dashboardSlice";
import {
  Avatar,
  Badge,
  Card,
  ChartTooltip,
  ProgressRing,
  Skeleton,
  StatCard,
} from "../components/ui";
import { cn } from "../utils/cn";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const QUICK_ACTIONS = [
  { to: "/attendance", icon: Camera, label: "Start Face Scan", sub: "Mark attendance", grad: "grad-brand" },
  { to: "/students/register-face", icon: UserPlus, label: "Register Face", sub: "Enroll a student", grad: "bg-gradient-to-br from-emerald-500 to-teal-600" },
  { to: "/reports", icon: Sparkles, label: "Reports", sub: "Export insights", grad: "bg-gradient-to-br from-amber-500 to-orange-600" },
  { to: "/students", icon: Users, label: "Students", sub: "Manage roster", grad: "bg-gradient-to-br from-sky-500 to-blue-600" },
];

const PIE_COLORS = ["#4F46E5", "#E5E7EB"];

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { stats, status } = useAppSelector((s) => s.dashboard);
  const now = useClock();

  useEffect(() => {
    dispatch(fetchStats(undefined));
  }, [dispatch]);

  const firstName = user?.name?.split(" ")[0] ?? "Professor";
  const loading = status === "loading" && !stats;

  const sparkPresent = stats?.weeklyTrend.map((d) => d.present) ?? [0];
  const sparkAbsent = stats?.weeklyTrend.map((d) => d.absent) ?? [0];

  return (
    <div>
      {/* ===== Hero ===== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grad-brand relative mb-6 overflow-hidden rounded-[28px] p-7 shadow-glow sm:p-9"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <ScanFace
          size={220}
          className="absolute -right-6 -top-6 text-white/[0.08] floaty"
          strokeWidth={1.2}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-white/70">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {" · "}
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <h1 className="mt-2 text-[30px] font-extrabold tracking-tight text-white sm:text-[36px]">
              {greeting(now)}, {firstName} 👋
            </h1>
            <p className="mt-1.5 max-w-md text-[15px] text-white/75">
              {stats
                ? `${stats.presentToday} of ${stats.totalStudents} students present today. AI recognition is running at ${stats.recognitionAccuracy}%.`
                : "Loading today's attendance snapshot…"}
            </p>
          </div>
          <Link
            to="/attendance"
            className="group inline-flex items-center gap-3 rounded-[20px] bg-white px-7 py-4 text-[16px] font-bold text-brand-600 shadow-xl transition hover:scale-[1.03] hover:shadow-2xl"
          >
            <Camera size={22} className="transition group-hover:rotate-12" />
            Start Face Scan
            <ArrowRight size={18} className="transition group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[168px] !rounded-[24px]" />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Skeleton className="h-[340px] !rounded-[24px] xl:col-span-2" />
            <Skeleton className="h-[340px] !rounded-[24px]" />
          </div>
        </>
      ) : stats ? (
        <>
          {/* ===== Stat cards ===== */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={Users}
              iconBg="grad-brand"
              sparkData={sparkPresent}
              sparkColor="#4F46E5"
              sub="Enrolled this semester"
              delay={0.05}
            />
            <StatCard
              title="Present Today"
              value={stats.presentToday}
              icon={CircleCheck}
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
              sparkData={sparkPresent}
              sparkColor="#22C55E"
              sub="Marked via face scan"
              delay={0.1}
            />
            <StatCard
              title="Absent Today"
              value={stats.absentToday}
              icon={UserX}
              iconBg="bg-gradient-to-br from-rose-500 to-red-600"
              sparkData={sparkAbsent}
              sparkColor="#EF4444"
              sub="Not yet marked present"
              delay={0.15}
            />
            <StatCard
              title="Recognition Accuracy"
              value={stats.recognitionAccuracy}
              decimals={1}
              suffix="%"
              icon={Target}
              iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
              sub="Cosine match ≥ 0.55"
              delay={0.2}
            />
          </div>

          {/* ===== Charts row ===== */}
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Weekly trend */}
            <Card className="p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Attendance Trend</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Present vs absent · last 7 days</p>
                </div>
                <Badge tone="brand">Weekly</Badge>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.weeklyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="present" name="Present" stroke="#4F46E5" strokeWidth={3} fill="url(#gPresent)" />
                    <Area type="monotone" dataKey="absent" name="Absent" stroke="#F59E0B" strokeWidth={3} fill="url(#gAbsent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Today donut + accuracy */}
            <Card className="flex flex-col items-center justify-center gap-6 p-6">
              <div>
                <h3 className="text-center text-[18px] font-bold text-gray-900 dark:text-white">Today's Attendance</h3>
                <div className="mt-3 h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Present", value: stats.todayDonut.present },
                          { name: "Absent", value: stats.todayDonut.absent },
                        ]}
                        innerRadius={58}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                        cornerRadius={6}
                      >
                        {[0, 1].map((i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex justify-center gap-4 text-[13px]">
                  <span className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" /> Present
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-night-600" /> Absent
                  </span>
                </div>
              </div>
              <div className="w-full border-t border-gray-100 pt-5 text-center dark:border-white/[0.06]">
                <p className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Recognition Accuracy</p>
                <ProgressRing percent={stats.recognitionAccuracy} />
              </div>
            </Card>
          </div>

          {/* ===== Dept bars + quick actions + activity ===== */}
          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Department Attendance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Average attendance % by department</p>
                </div>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.departmentBars} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#4F46E5" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="department" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
                    <Bar dataKey="percent" name="Attendance %" fill="url(#gBar)" radius={[10, 10, 6, 6]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <h3 className="mb-4 text-[18px] font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((a, i) => (
                    <motion.div
                      key={a.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                    >
                      <Link
                        to={a.to}
                        className="card-hover flex flex-col items-center gap-2 rounded-[20px] border border-gray-100 bg-gray-50/60 p-4 text-center dark:border-white/[0.06] dark:bg-white/[0.03]"
                      >
                        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-white", a.grad)}>
                          <a.icon size={20} />
                        </span>
                        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100">{a.label}</span>
                        <span className="text-[11px] text-gray-400">{a.sub}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-3 text-[18px] font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                <div className="space-y-1">
                  {stats.recentActivity.slice(0, 5).map((n, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.07 }}
                      className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <Avatar name={n.text} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-gray-100">{n.text}</p>
                        <p className="text-[11px] text-gray-400">{n.time}</p>
                      </div>
                      <Badge tone={n.type === "success" ? "success" : n.type === "warning" ? "warning" : n.type === "error" ? "danger" : "info"}>
                        {n.type}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card className="p-10 text-center">
          <FileUp size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 font-semibold text-gray-600 dark:text-gray-300">Couldn't load dashboard data</p>
          <p className="text-sm text-gray-400">Is the Express server running on :5000?</p>
        </Card>
      )}
    </div>
  );
}
