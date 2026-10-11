import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileDown, FileText, TrendingDown, TrendingUp, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppDispatch } from "../store";
import { notify } from "../store/slices/notificationsSlice";
import { http, apiErrorMessage, downloadExport } from "../api/http";
import { resourcesApi } from "../api/resources";
import type { ClassItem, Department, ReportData } from "../types";
import {
  Card,
  ChartTooltip,
  EmptyState,
  Field,
  GhostButton,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from "../components/ui";
import { cn } from "../utils/cn";

function heatColor(p: number): string {
  if (p >= 90) return "bg-indigo-600";
  if (p >= 75) return "bg-indigo-400";
  if (p >= 60) return "bg-indigo-300";
  if (p >= 40) return "bg-amber-300";
  return "bg-red-300";
}

export default function Reports() {
  const dispatch = useAppDispatch();
  const [range, setRange] = useState("weekly");
  const [department, setDepartment] = useState("");
  const [subject, setSubject] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  useEffect(() => {
    resourcesApi.listDepartments().then(setDepartments).catch(() => {});
    resourcesApi.listClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    http
      .get<ReportData>("/reports", {
        params: {
          range,
          ...(department ? { department } : {}),
          ...(subject ? { subject } : {}),
        },
      })
      .then((r) => setReport(r.data))
      .catch((e) =>
        dispatch(notify({ type: "error", title: "Failed to load reports", message: apiErrorMessage(e) }))
      )
      .finally(() => setLoading(false));
  }, [dispatch, range, department, subject]);

  const subjects = [...new Set(classes.map((c) => c.subject))];

  const doExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      await downloadExport(format, {
        range,
        ...(department ? { department } : {}),
        ...(subject ? { subject } : {}),
      });
      dispatch(notify({ type: "success", title: "Export complete", message: `Report downloaded as ${format.toUpperCase()}.` }));
    } catch (e) {
      dispatch(notify({ type: "error", title: "Export failed", message: apiErrorMessage(e) }));
    } finally {
      setExporting(null);
    }
  };

  const summary = report?.summary ?? {};
  const num = (v: number | string | undefined) => (typeof v === "number" ? v : 0);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Deep-dive into attendance patterns and export insights"
        actions={
          <>
            <GhostButton onClick={() => doExport("csv")} disabled={exporting !== null}>
              {exporting === "csv" ? "…" : <FileText size={17} />} Export CSV
            </GhostButton>
            <GhostButton onClick={() => doExport("pdf")} disabled={exporting !== null}>
              {exporting === "pdf" ? "…" : <FileDown size={17} />} Export PDF
            </GhostButton>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Range">
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="!w-44">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="!w-52">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Subject">
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="!w-52">
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[168px] !rounded-[24px]" />
            ))}
          </div>
          <Skeleton className="mt-5 h-[340px] !rounded-[24px]" />
        </>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Avg. Attendance" value={num(summary.avgPercent)} decimals={1} suffix="%" icon={Users} iconBg="grad-brand" delay={0.05} />
            <StatCard title="Total Sessions" value={num(summary.sessions)} icon={FileText} iconBg="bg-gradient-to-br from-sky-500 to-blue-600" delay={0.1} />
            <StatCard title="Best Day" value={num(summary.bestDayPercent)} decimals={1} suffix="%" icon={TrendingUp} iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" sub={String(summary.bestDay ?? "")} delay={0.15} />
            <StatCard title="Lowest Day" value={num(summary.worstDayPercent)} decimals={1} suffix="%" icon={TrendingDown} iconBg="bg-gradient-to-br from-rose-500 to-red-600" sub={String(summary.worstDay ?? "")} delay={0.2} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Daily trend */}
            <Card className="p-6">
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Daily Attendance</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Present vs absent per day</p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="present" name="Present" stroke="#22C55E" strokeWidth={3} fill="url(#rPresent)" />
                    <Area type="monotone" dataKey="absent" name="Absent" stroke="#EF4444" strokeWidth={3} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Department comparison */}
            <Card className="p-6">
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Department Comparison</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Attendance % by department</p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.byDepartment} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="department" axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
                    <Bar dataKey="percent" name="Attendance %" radius={[0, 10, 10, 0]} maxBarSize={26}>
                      {report.byDepartment.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#4F46E5" : "#7C3AED"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Subject comparison */}
            <Card className="p-6">
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Subject Comparison</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Attendance % by subject</p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.bySubject} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#4F46E5" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
                    <Bar dataKey="percent" name="Attendance %" fill="url(#rSub)" radius={[10, 10, 6, 6]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Heatmap */}
            <Card className="p-6">
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Attendance Heatmap</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily attendance intensity</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {report.heatmap.map((h, i) => (
                  <motion.div
                    key={h.date}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.015, 0.6) }}
                    title={`${h.date}: ${h.percent.toFixed(1)}%`}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl text-[10px] font-bold text-white cursor-default",
                      heatColor(h.percent)
                    )}
                  >
                    {h.date.slice(8)}
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                <span>Low</span>
                <span className="h-3 w-3 rounded bg-red-300" />
                <span className="h-3 w-3 rounded bg-amber-300" />
                <span className="h-3 w-3 rounded bg-indigo-300" />
                <span className="h-3 w-3 rounded bg-indigo-400" />
                <span className="h-3 w-3 rounded bg-indigo-600" />
                <span>High</span>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Download}
          title="No report data"
          message="Try a different range or filter."
        />
      )}
    </div>
  );
}
