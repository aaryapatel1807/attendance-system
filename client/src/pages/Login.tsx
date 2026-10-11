import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, ChartBar, ScanFace, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { login } from "../store/slices/authSlice";
import { notify } from "../store/slices/notificationsSlice";
import { Field, Input, PrimaryButton } from "../components/ui";

const FEATURES = [
  { icon: ScanFace, title: "AI Face Recognition", text: "Pretrained neural models match faces in seconds" },
  { icon: Camera, title: "One-Click Attendance", text: "Point the camera, scan, and save — done" },
  { icon: ChartBar, title: "Rich Analytics", text: "Trends, heatmaps and department insights" },
  { icon: ShieldCheck, title: "Secure & Private", text: "JWT auth, role-based access, on-prem AI" },
];

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((s) => s.auth);
  const [tab, setTab] = useState<"staff" | "student">("staff");
  const [email, setEmail] = useState("sharma@college.edu");
  const [password, setPassword] = useState("teacher123");
  const [identifier, setIdentifier] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const creds =
      tab === "staff"
        ? { email, password }
        : { email: identifier, password: studentPassword };
    const res = await dispatch(login(creds));
    if (login.fulfilled.match(res)) {
      dispatch(notify({ type: "success", title: `Welcome back, ${res.payload.name.split(" ")[0]}!`, message: "Signed in successfully." }));
      navigate(res.payload.role === "student" ? "/portal" : "/");
    }
  };

  const switchTab = (t: "staff" | "student") => {
    setTab(t);
    if (t === "student" && !identifier) setIdentifier("CS2024001");
    if (t === "student" && !studentPassword) setStudentPassword("student123");
  };

  const loading = status === "loading";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-night-950">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <div className="grad-brand absolute inset-0" />
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <ScanFace size={26} />
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight">FaceTrack AI</p>
              <p className="text-sm text-white/70">Smart Attendance System</p>
            </div>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md text-[44px] font-extrabold leading-[1.1] tracking-tight"
            >
              Attendance, recognized in seconds.
            </motion.h1>
            <p className="mt-4 max-w-sm text-[16px] text-white/75">
              AI-powered face recognition marks classroom attendance automatically — no roll calls, no proxies.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  className="rounded-[20px] bg-white/10 p-4 backdrop-blur-md"
                >
                  <f.icon size={22} className="mb-2" />
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/70">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/60">Trusted by modern campuses · FaceTrack AI v1.0</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[420px]"
        >
          <div className="grad-brand mb-6 flex h-14 w-14 items-center justify-center rounded-[20px] text-white shadow-glow lg:hidden">
            <ScanFace size={28} />
          </div>
          <h2 className="text-[32px] font-extrabold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="mt-1.5 text-[15px] text-gray-500 dark:text-gray-400">
            Sign in to your FaceTrack AI account
          </p>

          {/* Staff / Student tabs */}
          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-gray-100 p-1 dark:bg-white/[0.06]">
            {(["staff", "student"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`relative rounded-xl py-2.5 text-sm font-bold capitalize transition-colors ${
                  tab === t ? "text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {tab === t && <motion.span layoutId="login-tab" className="grad-brand absolute inset-0 rounded-xl" />}
                <span className="relative z-10">{t}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {tab === "staff" ? (
              <>
                <Field label="Email address">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    required
                    autoComplete="email"
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Roll number or email">
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="CS2024001"
                    required
                    autoComplete="username"
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </Field>
              </>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
              >
                {error}
              </motion.p>
            )}

            <PrimaryButton type="submit" loading={loading} className="w-full !py-4">
              Sign in
            </PrimaryButton>
          </form>

          <div className="mt-8 rounded-[20px] border border-dashed border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-night-850">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              <Users size={14} /> Demo accounts
            </p>
            <div className="space-y-1.5 text-[13px] text-gray-500 dark:text-gray-400">
              <p><span className="font-semibold text-gray-700 dark:text-gray-200">Teacher:</span> sharma@college.edu · teacher123</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-200">Admin:</span> admin@college.edu · admin123</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-200">Student:</span> CS2024001 · student123</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
