import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Camera,
  ChartBar,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Moon,
  ScanFace,
  Settings as SettingsIcon,
  Sun,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../store";
import { logoutUser } from "../store/slices/authSlice";
import { fetchStats } from "../store/slices/dashboardSlice";
import { Avatar, Badge } from "./ui";
import { cn } from "../utils/cn";

const STAFF_NAV = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/attendance", label: "Attendance", icon: Camera },
  { to: "/students", label: "Students", icon: Users },
  { to: "/classes", label: "Classes", icon: GraduationCap },
  { to: "/reports", label: "Reports", icon: ChartBar },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const STUDENT_NAV = [
  { to: "/portal", label: "My Attendance", icon: GraduationCap, end: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const nav = user?.role === "student" ? STUDENT_NAV : STAFF_NAV;

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 pb-6 pt-2">
        <div className="grad-brand floaty flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-glow">
          <ScanFace size={24} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[17px] font-extrabold tracking-tight text-gray-900 dark:text-white">
            FaceTrack <span className="grad-text">AI</span>
          </p>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Smart Attendance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors",
                isActive
                  ? "text-white"
                  : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: "spring", damping: 28, stiffness: 360 }}
                    className="grad-brand absolute inset-0 rounded-2xl shadow-glow"
                  />
                )}
                <item.icon size={20} strokeWidth={2.2} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile / logout */}
      <div className="mt-4 rounded-[20px] bg-gray-50 p-3.5 dark:bg-white/[0.04]">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name ?? "User"} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{user?.name}</p>
            <Badge tone="brand" className="mt-0.5 !text-[10px] capitalize">{user?.role}</Badge>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { theme, toggle } = useTheme();
  const { user } = useAppSelector((s) => s.auth);
  const { stats } = useAppSelector((s) => s.dashboard);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isStudent = user?.role === "student";

  useEffect(() => {
    // Dashboard stats are staff-only; students would get 403.
    if (!isStudent) dispatch(fetchStats(undefined));
  }, [dispatch, isStudent]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/students${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`);
    if (location.pathname !== "/students") setSearch("");
  };

  const notifications = stats?.recentActivity ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 dark:bg-night-950 dark:text-white">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-600/10" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/10" />
      </div>

      {/* Desktop sidebar */}
      <aside className="glass card-shadow fixed bottom-5 left-5 top-5 z-40 hidden w-[264px] rounded-[28px] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="glass fixed bottom-4 left-4 top-4 z-50 w-[280px] rounded-[28px] card-shadow lg:hidden"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-night-700 dark:text-gray-300"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="relative z-10 lg:pl-[304px]">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 px-4 pb-2 pt-4 sm:px-6">
          <div className="glass card-shadow mx-auto flex max-w-[1280px] items-center gap-3 rounded-[24px] px-4 py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <form onSubmit={submitSearch} className="hidden flex-1 sm:block">
              {!isStudent && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students, classes…  (Enter)"
                  className="w-full max-w-md rounded-2xl border border-transparent bg-gray-100/80 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:bg-white/[0.05] dark:text-white dark:focus:bg-night-800"
                />
              )}
            </form>
            <div className="flex-1 sm:hidden" />

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 dark:text-amber-300 dark:hover:bg-white/[0.06]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -60, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 60, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Notifications (staff only — feed comes from dashboard stats) */}
            {!isStudent && (
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                aria-label="Notifications"
              >
                <Bell size={19} />
                {notifications.length > 0 && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="glass card-shadow absolute right-0 top-12 w-[340px] rounded-[20px] p-2"
                  >
                    <p className="px-3 pb-1 pt-2 text-sm font-bold text-gray-900 dark:text-white">Notifications</p>
                    {notifications.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-gray-400">You're all caught up 🎉</p>
                    )}
                    {notifications.map((n, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                        <span
                          className={cn(
                            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                            n.type === "success" && "bg-green-500",
                            n.type === "warning" && "bg-amber-500",
                            n.type === "error" && "bg-red-500",
                            n.type === "info" && "bg-blue-500"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{n.text}</p>
                          <p className="text-xs text-gray-400">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen((v) => !v)} className="rounded-full transition hover:ring-4 hover:ring-indigo-500/15">
                <Avatar name={user?.name ?? "User"} size={40} />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="glass card-shadow absolute right-0 top-12 w-[240px] rounded-[20px] p-2"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="truncate text-xs text-gray-400">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                    >
                      <SettingsIcon size={16} /> Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
