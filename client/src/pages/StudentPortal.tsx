import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Webcam from "react-webcam";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  UserPlus,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppSelector } from "../store";
import { http } from "../api/http";
import type {
  EnrollFaceResult,
  MarkAttendanceResult,
  PortalAttendance,
  PortalClass,
  PortalProfile,
  VerifyFaceResult,
} from "../types";
import {
  Avatar,
  Badge,
  Card,
  ChartTooltip,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  ProgressRing,
  Skeleton,
  StatCard,
} from "../components/ui";
import { cn } from "../utils/cn";

const videoConstraints = { width: 1280, height: 720, facingMode: "user" as const };

const VERIFY_MESSAGES: Record<NonNullable<VerifyFaceResult["reason"]>, { title: string; message: string }> = {
  no_face: {
    title: "No face detected",
    message: "Make sure your face is well lit, centered in the frame, and looking at the camera.",
  },
  no_match: {
    title: "No match found",
    message: "Your face isn't registered yet. Ask your teacher to register it, then try again.",
  },
  not_you: {
    title: "That doesn't look like you",
    message: "The face in the camera doesn't match your registered face. Please make sure you're the one being scanned.",
  },
};

function VerifyFaceSection({ faceRegistered }: { faceRegistered: boolean }) {
  const webcamRef = useRef<Webcam>(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyFaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanFace = async () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      setError("Couldn't capture a photo. Please try again.");
      return;
    }
    setVerifying(true);
    setError(null);
    setResult(null);
    const started = Date.now();
    try {
      const r = await http.post<VerifyFaceResult>("/portal/verify-face", { image: shot });
      const elapsed = Date.now() - started;
      if (elapsed < 900) await new Promise((r2) => setTimeout(r2, 900 - elapsed));
      setResult(r.data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Verification failed. Please try again.";
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const reasonMsg = result?.reason ? VERIFY_MESSAGES[result.reason] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="mt-5 p-7">
        <div className="flex items-center gap-4">
          <span className="grad-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Verify My Face</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Prove it's really you. Verification only — this never marks attendance.
            </p>
          </div>
        </div>

        {!faceRegistered && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle size={16} />
            Your face isn't registered yet — ask your teacher to register it for the best result.
          </div>
        )}

        <div className="mx-auto mt-5 max-w-xl">
          <div className="grad-border relative overflow-hidden rounded-[24px] bg-black card-shadow">
            <div className="relative aspect-video w-full overflow-hidden rounded-[24px]">
              {camOn && !camError ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.9}
                  videoConstraints={videoConstraints}
                  className="webcam-mirror h-full w-full object-cover"
                  onUserMediaError={() => setCamError(true)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-night-900 text-gray-400">
                  <Camera size={44} className="text-gray-600" />
                  <p className="max-w-[260px] text-center text-sm font-medium">
                    {camError
                      ? "Camera unavailable. Check your browser permissions and try again."
                      : "Camera is off"}
                  </p>
                  <button
                    onClick={() => {
                      setCamError(false);
                      setCamOn(true);
                    }}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    {camError ? "Retry camera" : "Open camera"}
                  </button>
                </div>
              )}
              {verifying && (
                <div className="scanline pointer-events-none absolute left-[6%] right-[6%] h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_4px_rgba(103,232,249,0.8)]" />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {camOn && !camError && !verifying && !result && (
              <PrimaryButton onClick={scanFace}>
                <ScanFace size={18} /> Scan my face
              </PrimaryButton>
            )}
            {verifying && (
              <PrimaryButton disabled>
                <Loader2 size={18} className="animate-spin" /> Verifying…
              </PrimaryButton>
            )}
            {result && !verifying && (
              <GhostButton
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
              >
                <RotateCcw size={16} /> Scan again
              </GhostButton>
            )}
          </div>

          {/* Result */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-center text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
              >
                {error}
              </motion.div>
            )}
            {result && !error && (
              <motion.div
                key={result.verified ? "verified" : "not-verified"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={cn(
                  "mt-4 rounded-[24px] px-6 py-6 text-center",
                  result.verified
                    ? "bg-green-50 dark:bg-green-500/10"
                    : "bg-amber-50 dark:bg-amber-500/10"
                )}
              >
                {result.verified ? (
                  <>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white"
                    >
                      <CheckCircle2 size={32} />
                    </motion.span>
                    <p className="mt-3 text-lg font-extrabold text-green-700 dark:text-green-300">
                      Verified as you
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                      {result.student?.name} · {result.student?.rollNumber}
                    </p>
                    {typeof result.confidence === "number" && (
                      <div className="mt-3 inline-block">
                        <Badge tone="success">
                          {(result.confidence * 100).toFixed(1)}% confidence
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white"
                    >
                      <AlertTriangle size={30} />
                    </motion.span>
                    <p className="mt-3 text-lg font-extrabold text-amber-700 dark:text-amber-300">
                      {reasonMsg?.title ?? "Not verified"}
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-300">
                      {reasonMsg?.message}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

/** Capture the webcam frame downscaled to ~480px JPEG to keep uploads small. */
function captureSample(webcamRef: React.RefObject<Webcam | null>): string | null {
  const video = webcamRef.current?.video as HTMLVideoElement | undefined;
  if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
  const targetW = 480;
  const scale = targetW / video.videoWidth;
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

const ENROLL_SAMPLES = 40;
const ENROLL_INTERVAL_MS = 600;
const ENROLL_POSES = [
  "Look straight ahead",
  "Turn slightly left",
  "Turn slightly right",
  "Tilt your chin up a little",
  "Smile",
];

type EnrollPhase = "idle" | "ready" | "capturing" | "uploading" | "done" | "error";

/** Camera-guided face enrollment: 40 auto-captured samples with pose prompts. */
function EnrollFaceSection({
  faceRegistered,
  onEnrolled,
}: {
  faceRegistered: boolean;
  onEnrolled: () => void;
}) {
  const webcamRef = useRef<Webcam>(null);
  const samplesRef = useRef<string[]>([]);
  const [open, setOpen] = useState(false);
  const [camError, setCamError] = useState(false);
  const [phase, setPhase] = useState<EnrollPhase>("idle");
  const [count, setCount] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    samplesRef.current = [];
    setCount(0);
    setPhase("idle");
    setError(null);
    setCamError(false);
  };
  const close = () => {
    reset();
    setOpen(false);
  };

  const uploadSamples = async () => {
    setPhase("uploading");
    try {
      const r = await http.post<EnrollFaceResult>("/portal/enroll-face", {
        images: samplesRef.current,
      });
      if (!r.data?.success) throw new Error("Enrollment failed. Please try again.");
      setPhase("done");
      onEnrolled();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Upload failed. Please try again.";
      setError(msg);
      setPhase("error");
    }
  };

  // Countdown 3-2-1 before capture starts
  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) {
      setPhase("capturing");
      return;
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, countdown]);

  // Auto-capture loop
  useEffect(() => {
    if (phase !== "capturing") return;
    const id = window.setInterval(() => {
      const shot = captureSample(webcamRef);
      if (!shot) return; // missed frame — don't count it
      samplesRef.current.push(shot);
      setCount(samplesRef.current.length);
      if (samplesRef.current.length >= ENROLL_SAMPLES) {
        window.clearInterval(id);
        void uploadSamples();
      }
    }, ENROLL_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const pose = ENROLL_POSES[Math.floor(count / 8) % ENROLL_POSES.length];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.04 }}
      >
        <Card className="mt-5 p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grad-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
                <UserPlus size={24} />
              </span>
              <div>
                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">
                  {faceRegistered ? "Face Enrollment" : "Register My Face"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {faceRegistered
                    ? "Your face is enrolled. Re-register anytime to improve recognition."
                    : "Enroll with your camera — 40 quick samples with guided poses."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={faceRegistered ? "success" : "warning"}>
                {faceRegistered ? "Face registered" : "Not enrolled"}
              </Badge>
              <PrimaryButton onClick={() => { setOpen(true); setCountdown(3); }}>
                <Video size={18} /> {faceRegistered ? "Re-register" : "Start enrollment"}
              </PrimaryButton>
            </div>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white p-6 dark:bg-night-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Face enrollment
                </h3>
                <button
                  onClick={close}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grad-border relative mt-4 overflow-hidden rounded-[20px] bg-black">
                <div className="relative aspect-video w-full overflow-hidden rounded-[20px]">
                  {!camError ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      className="webcam-mirror h-full w-full object-cover"
                      onUserMedia={() => {
                        if (phase === "idle") setPhase("ready");
                      }}
                      onUserMediaError={() => setCamError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-night-900 text-gray-400">
                      <Camera size={40} className="text-gray-600" />
                      <p className="max-w-[260px] text-center text-sm font-medium">
                        Camera unavailable. Check your browser permissions and try again.
                      </p>
                    </div>
                  )}
                  {phase === "ready" && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-7xl font-extrabold text-white"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                  )}
                  {phase === "capturing" && (
                    <div className="scanline pointer-events-none absolute left-[6%] right-[6%] h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_4px_rgba(103,232,249,0.8)]" />
                  )}
                </div>
              </div>

              <div className="mt-5 text-center">
                {phase === "idle" && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Allow camera access to begin. Stay still and follow the prompts.
                  </p>
                )}
                {phase === "ready" && (
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Get ready — keep your face in the frame
                  </p>
                )}
                {phase === "capturing" && (
                  <>
                    <p className="text-base font-extrabold text-gray-900 dark:text-white">{pose}</p>
                    <div className="mx-auto mt-3 w-fit">
                      <ProgressRing
                        percent={(count / ENROLL_SAMPLES) * 100}
                        size={110}
                        label={`${count}/${ENROLL_SAMPLES}`}
                        sublabel="samples"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Capturing samples…</p>
                  </>
                )}
                {phase === "uploading" && (
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Loader2 size={18} className="animate-spin" /> Uploading {count} samples…
                  </div>
                )}
                {phase === "done" && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-2"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 14 }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white"
                    >
                      <CheckCircle2 size={32} />
                    </motion.span>
                    <p className="mt-3 text-lg font-extrabold text-green-700 dark:text-green-300">
                      Face enrolled successfully
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {count} samples saved. You can now mark attendance with your face.
                    </p>
                    <PrimaryButton className="mt-4" onClick={close}>
                      Done
                    </PrimaryButton>
                  </motion.div>
                )}
                {phase === "error" && (
                  <div className="py-2">
                    <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      {error}
                    </p>
                    <GhostButton
                      className="mt-4"
                      onClick={() => { reset(); setCountdown(3); }}
                    >
                      <RotateCcw size={16} /> Try again
                    </GhostButton>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type MarkPhase = "idle" | "camera" | "sending" | "result";

/** One-tap attendance: today's classes with a camera button each. */
function TodayAttendanceSection({ onMarked }: { onMarked: () => void }) {
  const webcamRef = useRef<Webcam>(null);
  const [classes, setClasses] = useState<PortalClass[] | null>(null);
  const [todayStatus, setTodayStatus] = useState<Record<string, "present" | "absent">>({});
  const [activeClass, setActiveClass] = useState<PortalClass | null>(null);
  const [phase, setPhase] = useState<MarkPhase>("idle");
  const [camError, setCamError] = useState(false);
  const [result, setResult] = useState<MarkAttendanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const load = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        http.get<{ data: PortalClass[] }>("/portal/classes"),
        http.get<PortalAttendance>("/portal/attendance"),
      ]);
      const cls = cRes.data.data ?? [];
      setClasses(cls);
      const today = todayStr();
      const status: Record<string, "present" | "absent"> = {};
      for (const c of cls) {
        const entry = (aRes.data.history ?? []).find(
          (h) => h.date === today && h.subject === c.subject
        );
        status[c.id] = entry ? entry.status : "absent";
      }
      setTodayStatus(status);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openFor = (c: PortalClass) => {
    setActiveClass(c);
    setResult(null);
    setError(null);
    setCamError(false);
    setPhase("camera");
  };
  const close = () => {
    setActiveClass(null);
    setResult(null);
    setError(null);
    setCamError(false);
    setPhase("idle");
  };

  const mark = async () => {
    const shot = captureSample(webcamRef);
    if (!shot || !activeClass) {
      setError("Couldn't capture a photo. Please try again.");
      return;
    }
    setPhase("sending");
    setError(null);
    try {
      const r = await http.post<MarkAttendanceResult>("/portal/mark-attendance", {
        image: shot,
        classId: activeClass.id,
      });
      setResult(r.data);
      setPhase("result");
      if (r.data.marked) {
        await load();
        onMarked();
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Couldn't mark attendance. Please try again.";
      setError(msg);
      setPhase("result");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="mt-5 p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Camera size={24} />
            </span>
            <div>
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">
                Today's Attendance
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tap the camera on a class and look at it — one tap, you're marked.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {classes === null && <Skeleton className="h-20 !rounded-2xl" />}
            {classes !== null && classes.length === 0 && (
              <EmptyState
                icon={CalendarDays}
                title="No classes found"
                message="No classes match your department and semester yet."
              />
            )}
            {(classes ?? []).map((c) => {
              const st = todayStatus[c.id] ?? "absent";
              const done = st === "present";
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-5 py-4 dark:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-gray-900 dark:text-white">
                      {c.subject}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {[c.name, c.teacherName, c.schedule].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={done ? "success" : "warning"}>
                      {done ? "Present today" : "Not marked"}
                    </Badge>
                    <button
                      onClick={() => openFor(c)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform hover:scale-105 active:scale-95",
                        done ? "bg-gray-300 dark:bg-white/10" : "grad-brand"
                      )}
                      title={done ? "Mark again" : "Mark attendance"}
                      aria-label={`Mark attendance for ${c.subject}`}
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {activeClass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white p-6 dark:bg-night-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Mark attendance · {activeClass.subject}
                </h3>
                <button
                  onClick={close}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {phase !== "result" ? (
                <>
                  <div className="grad-border relative mt-4 overflow-hidden rounded-[20px] bg-black">
                    <div className="relative aspect-video w-full overflow-hidden rounded-[20px]">
                      {!camError ? (
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          videoConstraints={videoConstraints}
                          className="webcam-mirror h-full w-full object-cover"
                          onUserMediaError={() => setCamError(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-night-900 text-gray-400">
                          <Camera size={40} className="text-gray-600" />
                          <p className="max-w-[260px] text-center text-sm font-medium">
                            Camera unavailable. Check your browser permissions and try again.
                          </p>
                        </div>
                      )}
                      {phase === "sending" && (
                        <div className="scanline pointer-events-none absolute left-[6%] right-[6%] h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_4px_rgba(103,232,249,0.8)]" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    {phase === "sending" ? (
                      <PrimaryButton disabled>
                        <Loader2 size={18} className="animate-spin" /> Matching your face…
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={mark} disabled={camError}>
                        <ScanFace size={18} /> Mark me present
                      </PrimaryButton>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  {error ? (
                    <>
                      <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                      </p>
                      <GhostButton className="mt-4" onClick={() => { setError(null); setPhase("camera"); }}>
                        <RotateCcw size={16} /> Try again
                      </GhostButton>
                    </>
                  ) : result?.marked ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 14 }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white"
                      >
                        <CheckCircle2 size={32} />
                      </motion.span>
                      <p className="mt-3 text-lg font-extrabold text-green-700 dark:text-green-300">
                        You're marked present for {result.subject}
                      </p>
                      {typeof result.confidence === "number" && (
                        <div className="mt-3">
                          <Badge tone="success">
                            {(result.confidence * 100).toFixed(1)}% confidence
                          </Badge>
                        </div>
                      )}
                      <PrimaryButton className="mt-4" onClick={close}>
                        Done
                      </PrimaryButton>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 14 }}
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white"
                      >
                        <AlertTriangle size={30} />
                      </motion.span>
                      <p className="mt-3 text-lg font-extrabold text-amber-700 dark:text-amber-300">
                        Face is not matched. Try it again.
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                        Make sure you're well lit, facing the camera, and your face is enrolled.
                      </p>
                      <GhostButton className="mt-4" onClick={() => { setResult(null); setPhase("camera"); }}>
                        <RotateCcw size={16} /> Try again
                      </GhostButton>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function StudentPortal() {
  const { user } = useAppSelector((s) => s.auth);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [attendance, setAttendance] = useState<PortalAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const [p, a] = await Promise.all([
      http.get<PortalProfile>("/portal/me").then((r) => r.data).catch(() => null),
      http.get<PortalAttendance>("/portal/attendance").then((r) => r.data).catch(() => null),
    ]);
    setProfile(p);
    setAttendance(a);
    setLoading(false);
  };

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
          {/* Today's classes — one-tap face attendance */}
          <TodayAttendanceSection onMarked={refresh} />

          {/* Camera-guided face enrollment */}
          <EnrollFaceSection
            faceRegistered={!!profile?.faceRegistered}
            onEnrolled={refresh}
          />

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

          {/* Face verification */}
          <VerifyFaceSection faceRegistered={!!profile?.faceRegistered} />

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
