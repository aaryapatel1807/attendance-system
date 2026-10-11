import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  RotateCcw,
  Save,
  ScanLine,
  ShieldQuestion,
  Sparkles,
  UserX,
} from "lucide-react";
import Webcam from "react-webcam";
import { useAppDispatch, useAppSelector } from "../store";
import { recognizeImage, resetRecognize, saveAttendance } from "../store/slices/attendanceSlice";
import { notify } from "../store/slices/notificationsSlice";
import { resourcesApi } from "../api/resources";
import { apiErrorMessage } from "../api/http";
import type { ClassItem, RecognizeResponse } from "../types";
import { Avatar, Badge, Card, Field, PageHeader, PrimaryButton, GhostButton, Select } from "../components/ui";
import { cn } from "../utils/cn";

const STAGES = [
  { label: "Scanning…", icon: ScanLine },
  { label: "Detecting Faces…", icon: Camera },
  { label: "Matching Database…", icon: Sparkles },
  { label: "Recognizing Students…", icon: BadgeCheck },
];

type Phase = "idle" | "scanning" | "results";

const videoConstraints = { width: 1280, height: 720, facingMode: "user" as const };

export default function Attendance() {
  const dispatch = useAppDispatch();
  const { recognizeStatus } = useAppSelector((s) => s.attendance);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<RecognizeResponse | null>(null);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [camError, setCamError] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    resourcesApi
      .listClasses()
      .then((c) => {
        setClasses(c);
        if (c.length > 0) setClassId(c[0].id);
      })
      .catch(() => {});
    return () => {
      dispatch(resetRecognize());
    };
  }, [dispatch]);

  // Stage text cycler while scanning
  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setInterval(() => setStageIdx((i) => (i + 1) % STAGES.length), 1600);
    return () => clearInterval(t);
  }, [phase]);

  const handleScan = useCallback(async () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      dispatch(notify({ type: "error", title: "Camera unavailable", message: "Could not capture a frame. Check camera permissions." }));
      return;
    }
    setPhase("scanning");
    setStageIdx(0);
    setResult(null);
    const res = await dispatch(recognizeImage(shot));
    if (recognizeImage.fulfilled.match(res)) {
      const data = res.payload;
      setResult(data);
      setPresentMap(Object.fromEntries(data.matches.map((m) => [m.studentId, true])));
      setPhase("results");
      if (data.matches.length === 0 && data.unknown.length === 0) {
        dispatch(notify({ type: "warning", title: "No faces detected", message: "Try moving closer to the camera." }));
      } else if (data.unknown.length > 0) {
        dispatch(
          notify({
            type: "warning",
            title: "Unknown Face Detected",
            message: `${data.unknown.length} face${data.unknown.length > 1 ? "s" : ""} not in the database.`,
          })
        );
      }
    } else {
      setPhase("idle");
      dispatch(notify({ type: "error", title: "Recognition Failed", message: apiErrorMessage(res.payload) }));
    }
  }, [dispatch]);

  const togglePresent = (studentId: string) =>
    setPresentMap((m) => ({ ...m, [studentId]: !m[studentId] }));

  const handleSave = async () => {
    if (!result || !classId) return;
    const cls = classes.find((c) => c.id === classId);
    setSaving(true);
    const payload = {
      classId,
      subject: cls?.subject ?? "General",
      date: new Date().toISOString().slice(0, 10),
      records: result.matches.map((m) => ({
        studentId: m.studentId,
        status: (presentMap[m.studentId] ? "present" : "absent") as "present" | "absent",
        confidence: m.confidence,
      })),
    };
    const res = await dispatch(saveAttendance(payload));
    setSaving(false);
    if (saveAttendance.fulfilled.match(res)) {
      dispatch(
        notify({
          type: "success",
          title: "Attendance Saved",
          message: `${res.payload} record${res.payload === 1 ? "" : "s"} saved for ${cls?.subject ?? "the class"}.`,
        })
      );
      setPhase("idle");
      setResult(null);
    } else {
      dispatch(notify({ type: "error", title: "Save failed", message: apiErrorMessage(res.payload) }));
    }
  };

  const recognized = result?.matches ?? [];
  const unknown = result?.unknown ?? [];
  const presentCount = recognized.filter((m) => presentMap[m.studentId]).length;
  const scanning = phase === "scanning" || recognizeStatus === "scanning";
  const StageIcon = STAGES[stageIdx].icon;

  return (
    <div>
      <PageHeader
        title="Face Attendance"
        subtitle="Point the camera at the classroom and let AI mark attendance"
        actions={
          <Field label="">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="!w-56">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.subject}
                </option>
              ))}
            </Select>
          </Field>
        }
      />

      <div className="mx-auto max-w-4xl">
        {/* ===== Camera card ===== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="grad-border relative overflow-hidden rounded-[28px] bg-black card-shadow"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-[28px]">
            {cameraOn && !camError ? (
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
                <p className="text-sm font-medium">Camera is off or unavailable</p>
                <button
                  onClick={() => { setCamError(false); setCameraOn(true); }}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Retry camera
                </button>
              </div>
            )}

            {/* Corner brackets */}
            {["left-5 top-5 border-l-4 border-t-4 border-l-white/90 border-t-white/90 rounded-tl-xl",
              "right-5 top-5 border-r-4 border-t-4 border-r-white/90 border-t-white/90 rounded-tr-xl",
              "bottom-5 left-5 border-b-4 border-l-4 border-b-white/90 border-l-white/90 rounded-bl-xl",
              "bottom-5 right-5 border-b-4 border-r-4 border-b-white/90 border-r-white/90 rounded-br-xl"
            ].map((pos) => (
              <span key={pos} className={cn("pointer-events-none absolute h-12 w-12", pos, scanning && "corner-blink")} />
            ))}

            {/* Scanline */}
            {scanning && (
              <div className="scanline pointer-events-none absolute left-[6%] right-[6%] h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_4px_rgba(103,232,249,0.8)]" />
            )}

            {/* Stage overlay */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2"
                >
                  <div className="glass flex items-center gap-3 rounded-2xl px-5 py-3">
                    <StageIcon size={20} className="animate-pulse text-brand-600 dark:text-violet-400" />
                    <span className="text-[15px] font-bold text-gray-800 dark:text-white">
                      {STAGES[stageIdx].label}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ===== Controls ===== */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton
            onClick={handleScan}
            loading={scanning}
            disabled={scanning || camError || classes.length === 0}
            className="!px-10 !py-4 !text-[17px]"
          >
            <Camera size={20} />
            {scanning ? "Scanning…" : "Start Face Scan"}
          </PrimaryButton>
          <GhostButton onClick={() => setCameraOn((v) => !v)}>
            {cameraOn ? "Turn camera off" : "Turn camera on"}
          </GhostButton>
          {phase === "results" && (
            <GhostButton onClick={() => { setPhase("idle"); setResult(null); }}>
              <RotateCcw size={17} /> Scan Again
            </GhostButton>
          )}
        </div>

        {/* ===== Results ===== */}
        <AnimatePresence>
          {phase === "results" && result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8"
            >
              <Card className="p-6 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-bold text-gray-900 dark:text-white">Scan Results</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {recognized.length} recognized · {unknown.length} unknown · {presentCount} marked present
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="success">{presentCount} present</Badge>
                    {unknown.length > 0 && <Badge tone="danger">{unknown.length} unknown</Badge>}
                  </div>
                </div>

                {recognized.length === 0 && unknown.length === 0 && (
                  <p className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-400 dark:bg-white/[0.04]">
                    No faces were detected in the captured frame.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {recognized.map((m, i) => {
                    const present = !!presentMap[m.studentId];
                    return (
                      <motion.div
                        key={m.studentId}
                        initial={{ opacity: 0, y: 18, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.08, type: "spring", damping: 22, stiffness: 300 }}
                        className={cn(
                          "card-hover relative flex items-center gap-4 rounded-[20px] border-2 p-4",
                          present
                            ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/[0.06]"
                            : "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/[0.06]"
                        )}
                      >
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.25 + i * 0.08, type: "spring", damping: 12 }}
                          className={cn(
                            "absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg",
                            present ? "bg-green-500 pulse-ring" : "bg-amber-500"
                          )}
                        >
                          {present ? <CheckCircle2 size={18} /> : <UserX size={18} />}
                        </motion.span>
                        <Avatar name={m.name} photo={m.photo} size={56} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-bold text-gray-900 dark:text-white">{m.name}</p>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400">
                            {m.rollNumber} · {m.department}
                          </p>
                          <p className="mt-0.5 text-[12px] font-semibold text-brand-600 dark:text-violet-300">
                            {(m.confidence * 100).toFixed(1)}% match
                          </p>
                        </div>
                        <button
                          onClick={() => togglePresent(m.studentId)}
                          className={cn(
                            "rounded-xl px-3.5 py-2 text-[13px] font-bold transition",
                            present
                              ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-300"
                              : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
                          )}
                        >
                          {present ? "Present" : "Absent"}
                        </button>
                      </motion.div>
                    );
                  })}

                  {unknown.map((_, i) => (
                    <motion.div
                      key={`unknown-${i}`}
                      initial={{ opacity: 0, y: 18, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: (recognized.length + i) * 0.08 }}
                      className="flex items-center gap-4 rounded-[20px] border-2 border-red-200 bg-red-50/50 p-4 dark:border-red-500/25 dark:bg-red-500/[0.07]"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/15">
                        <ShieldQuestion size={26} />
                      </div>
                      <div>
                        <p className="flex items-center gap-1.5 text-[15px] font-bold text-red-700 dark:text-red-300">
                          <AlertTriangle size={16} /> Unknown Person
                        </p>
                        <p className="text-[13px] text-red-500/80 dark:text-red-400/80">
                          Not found in the face database
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {recognized.length > 0 && (
                  <div className="mt-6 flex justify-end gap-3">
                    <GhostButton onClick={() => { setPhase("idle"); setResult(null); }}>
                      <RotateCcw size={17} /> Scan Again
                    </GhostButton>
                    <PrimaryButton onClick={handleSave} disabled={saving || !classId} loading={saving}>
                      <Save size={18} /> Save Attendance
                    </PrimaryButton>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
