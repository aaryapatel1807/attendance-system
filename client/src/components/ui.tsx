import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store";
import { dismissToast } from "../store/slices/notificationsSlice";
import type { ToastType } from "../types";
import { cn } from "../utils/cn";

/* ============================== Card ============================== */

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-white card-shadow dark:bg-night-850 dark:border dark:border-white/[0.06]",
        hover && "card-hover",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ============================== Page header ============================== */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  );
}

/* ============================== Animated counter ============================== */

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
    });
    return () => controls.stop();
  }, [value, decimals, mv]);

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ============================== Sparkline ============================== */

export function Sparkline({
  data,
  color = "#4F46E5",
  width = 120,
  height = 40,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - 4 - ((v - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const id = `spark-${color.replace("#", "")}-${data.length}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================== Stat card ============================== */

export function StatCard({
  title,
  value,
  decimals = 0,
  suffix = "",
  icon: Icon,
  iconBg,
  sparkData,
  sparkColor,
  sub,
  delay = 0,
}: {
  title: string;
  value: number;
  decimals?: number;
  suffix?: string;
  icon: LucideIcon;
  iconBg: string;
  sparkData?: number[];
  sparkColor?: string;
  sub?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="card-hover rounded-[24px] bg-white card-shadow p-6 dark:bg-night-850 dark:border dark:border-white/[0.06]"
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white", iconBg)}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
      </div>
      <div className="mt-4">
        <AnimatedCounter
          value={value}
          decimals={decimals}
          suffix={suffix}
          className="text-[32px] font-bold tracking-tight text-gray-900 dark:text-white"
        />
        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ============================== Progress ring ============================== */

export function ProgressRing({
  percent,
  size = 120,
  stroke = 12,
  label,
  sublabel,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `ring-${size}-${stroke}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-night-700" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (Math.min(100, Math.max(0, percent)) / 100) * c }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter value={percent} decimals={1} suffix="%" className="text-2xl font-bold text-gray-900 dark:text-white" />
        {label && <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>}
        {sublabel && <span className="text-[10px] text-gray-400 dark:text-gray-500">{sublabel}</span>}
      </div>
    </div>
  );
}

/* ============================== Badge ============================== */

const badgeStyles: Record<string, string> = {
  success: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  brand: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  neutral: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof badgeStyles;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", badgeStyles[tone], className)}>
      {children}
    </span>
  );
}

/* ============================== Avatar ============================== */

export function Avatar({
  name,
  photo,
  size = 48,
  className,
}: {
  name: string;
  photo?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size }}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        "grad-brand flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        className
      )}
    >
      {initials}
    </div>
  );
}

/* ============================== Form controls ============================== */

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-white/[0.08] dark:bg-night-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-night-800 dark:focus:border-violet-500";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, "cursor-pointer appearance-none pr-10", props.className)} />;
}

// framer-motion's motion.button redefines onDrag* with different signatures,
// so strip React's versions from the pass-through props.
type MotionSafeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

export function PrimaryButton({
  children,
  className,
  loading,
  ...rest
}: MotionSafeButtonProps & { loading?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "grad-brand inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </motion.button>
  );
}

export function GhostButton({
  children,
  className,
  ...rest
}: MotionSafeButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[15px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.08] dark:bg-night-800 dark:text-gray-200 dark:hover:bg-night-700",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

/* ============================== Search input ============================== */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className={cn(inputCls, "pl-11")}
      />
    </div>
  );
}

/* ============================== Skeletons ============================== */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-2xl bg-gray-200/80 dark:bg-night-700", className)} />;
}

export function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[24px] bg-white p-6 card-shadow dark:bg-night-850">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 !rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-5 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/* ============================== Empty state ============================== */

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 bg-white/60 px-8 py-16 text-center dark:border-white/[0.08] dark:bg-night-850/60"
    >
      <div className="grad-brand mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] text-white opacity-90">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/* ============================== Modal & confirm ============================== */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm dark:bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "max-h-[90vh] w-full overflow-y-auto rounded-[28px] bg-white p-7 card-shadow dark:bg-night-850 dark:border dark:border-white/[0.08]",
              wide ? "max-w-2xl" : "max-w-lg"
            )}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-night-700 dark:text-gray-300 dark:hover:bg-night-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[15px] text-gray-600 dark:text-gray-300">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
        >
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {confirmLabel}
        </motion.button>
      </div>
    </Modal>
  );
}

/* ============================== Toasts ============================== */

const toastConfig: Record<ToastType, { icon: LucideIcon; bar: string }> = {
  success: { icon: CheckCircle2, bar: "bg-green-500" },
  error: { icon: XCircle, bar: "bg-red-500" },
  warning: { icon: AlertTriangle, bar: "bg-amber-500" },
  info: { icon: Info, bar: "bg-blue-500" },
};

export function ToastHost() {
  const toasts = useAppSelector((s) => s.notifications.toasts);
  const dispatch = useAppDispatch();

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} type={t.type} title={t.title} message={t.message} onDismiss={() => dispatch(dismissToast(t.id))} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  id,
  type,
  title,
  message,
  onDismiss,
}: {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  onDismiss: () => void;
}) {
  const { icon: Icon, bar } = toastConfig[type];

  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", damping: 24, stiffness: 320 }}
      className="glass pointer-events-auto relative overflow-hidden rounded-[20px] p-4 card-shadow"
    >
      <div className={cn("absolute left-0 top-0 h-full w-1.5", bar)} />
      <div className="flex items-start gap-3 pl-2">
        <Icon size={22} className={cn(bar.replace("bg-", "text-"))} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-gray-900 dark:text-white">{title}</p>
          {message && <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">{message}</p>}
        </div>
        <button onClick={onDismiss} className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

/* ============================== Chart tooltip ============================== */

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number | string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-2xl px-4 py-3 card-shadow">
      {label != null && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color ?? "#4F46E5" }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          <span className="ml-auto font-bold text-gray-900 dark:text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================== Toggle ============================== */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3"
    >
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors duration-200",
          checked ? "grad-brand" : "bg-gray-200 dark:bg-night-600"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", damping: 24, stiffness: 400 }}
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow",
            checked ? "right-1" : "left-1"
          )}
        />
      </span>
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>}
    </button>
  );
}
