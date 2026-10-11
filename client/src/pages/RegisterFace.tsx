import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ImagePlus, Loader2, ScanFace, Trash2, UploadCloud } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchStudents } from "../store/slices/studentsSlice";
import { registerFace } from "../store/slices/attendanceSlice";
import { notify } from "../store/slices/notificationsSlice";
import { apiErrorMessage } from "../api/http";
import {
  Avatar,
  Badge,
  Card,
  Field,
  PageHeader,
  PrimaryButton,
  Select,
} from "../components/ui";
import { cn } from "../utils/cn";

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 5;

export default function RegisterFace() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { items: students } = useAppSelector((s) => s.students);
  const [searchParams] = useSearchParams();

  const [studentId, setStudentId] = useState(searchParams.get("studentId") ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const isAdmin = user?.role === "admin";
  const selected = students.find((s) => s.id === studentId);

  useEffect(() => {
    dispatch(fetchStudents({ limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (!studentId && students.length > 0) setStudentId(students[0].id);
  }, [students, studentId]);

  // Animated progress while processing
  useEffect(() => {
    if (phase !== "processing") return;
    setProgress(4);
    const t = setInterval(() => {
      setProgress((p) => Math.min(96, p + Math.random() * 9));
    }, 420);
    return () => clearInterval(t);
  }, [phase]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    picked.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, String(reader.result)] : prev));
      reader.readAsDataURL(file);
    });
  };

  const handleRegister = async () => {
    if (!studentId || photos.length < MIN_PHOTOS) return;
    setPhase("processing");
    setErrorMsg("");
    const res = await dispatch(registerFace({ studentId, images: photos }));
    if (registerFace.fulfilled.match(res)) {
      setProgress(100);
      setTimeout(() => setPhase("done"), 500);
      dispatch(fetchStudents({ limit: 100 }));
      dispatch(
        notify({
          type: "success",
          title: "Face Registered",
          message: `${selected?.name} enrolled with ${res.payload.faces_found} face samples.`,
        })
      );
    } else {
      setPhase("error");
      const msg = apiErrorMessage(res.payload);
      setErrorMsg(msg);
      dispatch(notify({ type: "error", title: "Registration failed", message: msg }));
    }
  };

  const reset = () => {
    setPhase("idle");
    setPhotos([]);
    setProgress(0);
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Register Face" />
        <Card className="p-10 text-center">
          <ScanFace size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 font-bold text-gray-700 dark:text-gray-200">Admin access required</p>
          <p className="text-sm text-gray-400">Only administrators can register student faces.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Register Face"
        subtitle="Enroll 3–5 clear photos per student for AI recognition"
      />

      <div className="mx-auto max-w-3xl">
        <Card className="p-7 sm:p-8">
          <AnimatePresence mode="wait">
            {phase === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.1 }}
                  className="grad-brand mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-glow"
                >
                  <CheckCircle2 size={48} />
                </motion.div>
                <h3 className="mt-6 text-2xl font-extrabold text-gray-900 dark:text-white">
                  Face registered successfully
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-[15px] text-gray-500 dark:text-gray-400">
                  {selected?.name}'s face encoding is saved. They can now be recognized during attendance scans.
                </p>
                <PrimaryButton onClick={reset} className="mt-7">
                  Register another student
                </PrimaryButton>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Student picker */}
                <Field label="Student">
                  <div className="flex items-center gap-4">
                    {selected && <Avatar name={selected.name} photo={selected.photo} size={52} />}
                    <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="flex-1">
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.rollNumber}
                        </option>
                      ))}
                    </Select>
                    {selected?.faceRegistered && <Badge tone="success">Already registered</Badge>}
                  </div>
                </Field>

                {/* Upload zone */}
                <div className="mt-6">
                  <p className="mb-2 text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                    Photos <span className="font-normal text-gray-400">({photos.length}/{MAX_PHOTOS} · minimum {MIN_PHOTOS})</span>
                  </p>
                  <label
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-6 py-10 text-center transition",
                      "border-indigo-200 bg-indigo-50/40 hover:border-brand-600 hover:bg-indigo-50/80",
                      "dark:border-violet-500/25 dark:bg-violet-500/[0.05] dark:hover:border-violet-400"
                    )}
                  >
                    <UploadCloud size={36} className="text-brand-600 dark:text-violet-300" />
                    <p className="mt-3 text-[15px] font-bold text-gray-800 dark:text-gray-100">
                      Drop photos here or click to browse
                    </p>
                    <p className="mt-1 text-[13px] text-gray-400">
                      Front-facing, good lighting, different angles work best
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(e.target.files)}
                    />
                  </label>

                  {/* Previews */}
                  {photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                      <AnimatePresence>
                        {photos.map((p, i) => (
                          <motion.div
                            key={p.slice(-24) + i}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            className="group relative aspect-square overflow-hidden rounded-2xl card-shadow"
                          >
                            <img src={p} alt={`Sample ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                              onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                              aria-label="Remove photo"
                            >
                              <Trash2 size={14} />
                            </button>
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                              {i + 1}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <AnimatePresence>
                  {phase === "processing" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        <Loader2 size={16} className="animate-spin text-brand-600" />
                        Detecting faces & generating encodings… {Math.round(progress)}%
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-night-700">
                        <motion.div
                          animate={{ width: `${progress}%` }}
                          transition={{ ease: "easeOut", duration: 0.4 }}
                          className="grad-brand h-full rounded-full"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {phase === "error" && (
                  <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {errorMsg}
                  </p>
                )}

                <div className="mt-7 flex justify-end gap-3">
                  <button
                    onClick={reset}
                    className="rounded-2xl px-5 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  >
                    Clear
                  </button>
                  <PrimaryButton
                    onClick={handleRegister}
                    disabled={photos.length < MIN_PHOTOS || phase === "processing" || !studentId}
                    loading={phase === "processing"}
                  >
                    <ImagePlus size={18} />
                    Register {photos.length >= MIN_PHOTOS ? `${photos.length} photos` : "Face"}
                  </PrimaryButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
