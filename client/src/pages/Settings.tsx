import { motion } from "framer-motion";
import { Cpu, LogOut, Moon, ScanFace, ShieldCheck, Sun, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../store";
import { logoutUser } from "../store/slices/authSlice";
import { notify } from "../store/slices/notificationsSlice";
import { Avatar, Badge, Card, PageHeader, Toggle } from "../components/ui";
import { cn } from "../utils/cn";

export default function Settings() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(notify({ type: "info", title: "Signed out", message: "See you soon!" }));
    navigate("/login");
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, appearance and account" />

      <div className="mx-auto max-w-3xl space-y-5">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="p-7">
            <div className="flex flex-wrap items-center gap-5">
              <Avatar name={user?.name ?? "User"} size={76} />
              <div className="flex-1">
                <h3 className="text-[20px] font-extrabold text-gray-900 dark:text-white">{user?.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                <div className="mt-2">
                  <Badge tone="brand" className="capitalize !text-[12px]">{user?.role}</Badge>
                </div>
              </div>
              <div className="grad-brand flex h-14 w-14 items-center justify-center rounded-[18px] text-white/90">
                <UserIcon size={26} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
          <Card className="p-7">
            <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Appearance</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose how FaceTrack AI looks on this device</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {(
                [
                  { value: "light" as const, icon: Sun, label: "Light", desc: "Clean & bright" },
                  { value: "dark" as const, icon: Moon, label: "Dark", desc: "Deep gray, Linear-style" },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex items-center gap-4 rounded-[20px] border-2 p-5 text-left transition",
                    theme === opt.value
                      ? "border-brand-600 bg-indigo-50/60 dark:border-violet-500 dark:bg-violet-500/[0.08]"
                      : "border-gray-100 bg-gray-50/50 hover:border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl",
                      theme === opt.value ? "grad-brand text-white" : "bg-gray-200 text-gray-500 dark:bg-night-700 dark:text-gray-300"
                    )}
                  >
                    <opt.icon size={20} />
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold text-gray-900 dark:text-white">{opt.label}</span>
                    <span className="block text-xs text-gray-400">{opt.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-[20px] bg-gray-50 px-5 py-4 dark:bg-white/[0.04]">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Dark mode</span>
              <Toggle checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} />
            </div>
          </Card>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
          <Card className="p-7">
            <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">About</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4 rounded-[20px] bg-gray-50 px-5 py-4 dark:bg-white/[0.04]">
                <span className="grad-brand flex h-10 w-10 items-center justify-center rounded-xl text-white"><ScanFace size={20} /></span>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">FaceTrack AI v1.0</p>
                  <p className="text-xs text-gray-400">AI-powered face recognition attendance</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-[20px] bg-gray-50 px-5 py-4 dark:bg-white/[0.04]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Cpu size={20} /></span>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">MediaPipe + FaceNet</p>
                  <p className="text-xs text-gray-400">Pretrained detection & 512-dim embeddings</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-[20px] bg-gray-50 px-5 py-4 dark:bg-white/[0.04]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400"><ShieldCheck size={20} /></span>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">React · Express · FastAPI · MongoDB</p>
                  <p className="text-xs text-gray-400">JWT-secured SPA with on-prem AI service</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.18 }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] border-2 border-red-100 bg-red-50/60 px-6 py-4 text-[15px] font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-red-500/[0.07] dark:hover:bg-red-500/[0.12]"
          >
            <LogOut size={18} /> Sign out of FaceTrack AI
          </button>
        </motion.div>
      </div>
    </div>
  );
}
