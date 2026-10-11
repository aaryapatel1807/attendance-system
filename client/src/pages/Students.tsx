import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  Pencil,
  Plus,
  ScanFace,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import {
  createStudent,
  deleteStudent,
  fetchStudents,
  updateStudent,
} from "../store/slices/studentsSlice";
import { notify } from "../store/slices/notificationsSlice";
import { apiErrorMessage } from "../api/http";
import { resourcesApi } from "../api/resources";
import type { Department, Student } from "../types";
import {
  Avatar,
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  SearchInput,
  Select,
  SkeletonCards,
} from "../components/ui";
import { cn } from "../utils/cn";

function StudentForm({
  initial,
  departments,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: Student;
  departments: Department[];
  onSubmit: (data: Partial<Student>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    rollNumber: initial?.rollNumber ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    department: initial?.department ?? departments[0]?.name ?? "",
    semester: String(initial?.semester ?? 1),
    photo: initial?.photo ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...form, semester: Number(form.semester) });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={form.name} onChange={set("name")} placeholder="Aarav Patel" required />
        </Field>
        <Field label="Roll number">
          <Input value={form.rollNumber} onChange={set("rollNumber")} placeholder="CS2024001" required disabled={!!initial} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set("email")} placeholder="aarav@college.edu" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={set("phone")} placeholder="9876543210" />
        </Field>
        <Field label="Department">
          <Select value={form.department} onChange={set("department")}>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Semester">
          <Select value={form.semester} onChange={set("semester")}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Photo">
        <div className="flex items-center gap-4">
          <Avatar name={form.name || "New Student"} photo={form.photo || undefined} size={64} />
          <div className="flex-1">
            <Input type="file" accept="image/*" onChange={handlePhotoFile} />
            <p className="mt-1 text-xs text-gray-400">Upload a clear front-facing photo</p>
          </div>
        </div>
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-2xl px-5 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]">
          Cancel
        </button>
        <PrimaryButton type="submit" loading={saving}>
          {initial ? "Save changes" : "Add student"}
        </PrimaryButton>
      </div>
    </form>
  );
}

export default function Students() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { items, total, status, mutating } = useAppSelector((s) => s.students);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>();
  const [deleting, setDeleting] = useState<Student | undefined>();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    resourcesApi.listDepartments().then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(fetchStudents({
        search: search || undefined,
        department: department || undefined,
        semester: semester || undefined,
        limit: 24,
      }));
    }, 350);
    return () => clearTimeout(t);
  }, [dispatch, search, department, semester]);

  const onSearch = (v: string) => {
    setSearch(v);
    setSearchParams(v ? { search: v } : {});
  };

  const handleSubmit = async (data: Partial<Student>) => {
    const res = editing
      ? await dispatch(updateStudent({ id: editing.id, data }))
      : await dispatch(createStudent(data));
    if ((editing ? updateStudent : createStudent).fulfilled.match(res)) {
      dispatch(notify({
        type: "success",
        title: editing ? "Student updated" : "Student Added",
        message: `${data.name} ${editing ? "updated" : "added to the roster"}.`,
      }));
      setModalOpen(false);
      setEditing(undefined);
      dispatch(fetchStudents({ search: search || undefined, department: department || undefined, limit: 24 }));
    } else {
      dispatch(notify({ type: "error", title: "Failed to save student", message: apiErrorMessage(res.payload) }));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const res = await dispatch(deleteStudent(deleting.id));
    if (deleteStudent.fulfilled.match(res)) {
      dispatch(notify({ type: "success", title: "Student removed", message: deleting.name }));
      setDeleting(undefined);
    } else {
      dispatch(notify({ type: "error", title: "Delete failed", message: apiErrorMessage(res.payload) }));
    }
  };

  const filtered = useMemo(() => items, [items]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${total} enrolled · manage roster and face registration`}
        actions={
          isAdmin ? (
            <PrimaryButton onClick={() => { setEditing(undefined); setModalOpen(true); }}>
              <Plus size={18} /> Add Student
            </PrimaryButton>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={onSearch} placeholder="Search name or roll number…" className="w-full sm:w-80" />
        <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="!w-52">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </Select>
        <Select value={semester} onChange={(e) => setSemester(e.target.value)} className="!w-44">
          <option value="">All semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>Sem {s}</option>
          ))}
        </Select>
      </div>

      {status === "loading" && items.length === 0 ? (
        <SkeletonCards />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          message="Try a different search or filter — or add the first student to the roster."
          action={isAdmin ? (
            <PrimaryButton onClick={() => { setEditing(undefined); setModalOpen(true); }}>
              <Plus size={18} /> Add Student
            </PrimaryButton>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((st, i) => (
              <motion.div
                key={st.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className="card-hover rounded-[24px] bg-white p-5 card-shadow dark:bg-night-850 dark:border dark:border-white/[0.06]"
              >
                <div className="flex items-start justify-between">
                  <Link to={`/students/${st.id}`} className="flex items-center gap-3.5">
                    <Avatar name={st.name} photo={st.photo} size={56} />
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-bold text-gray-900 dark:text-white">{st.name}</p>
                      <p className="text-[13px] font-medium text-gray-400">{st.rollNumber}</p>
                    </div>
                  </Link>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditing(st); setModalOpen(true); }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-indigo-50 hover:text-brand-600 dark:hover:bg-white/[0.06]"
                        aria-label="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleting(st)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1.5 text-[13px]">
                  <p className="text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{st.department}</span> · Semester {st.semester}
                  </p>
                  {st.attendancePercent != null && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-night-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${st.attendancePercent}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={cn(
                            "h-full rounded-full",
                            st.attendancePercent >= 75 ? "grad-brand" : st.attendancePercent >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                        />
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-200">{st.attendancePercent.toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge tone={st.faceRegistered ? "success" : "warning"}>
                    <ScanFace size={12} /> {st.faceRegistered ? "Face registered" : "No face data"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {!st.faceRegistered && isAdmin && (
                      <Link
                        to={`/students/register-face?studentId=${st.id}`}
                        className="text-[13px] font-bold text-brand-600 hover:underline dark:text-violet-300"
                      >
                        Register
                      </Link>
                    )}
                    <Link
                      to={`/students/${st.id}`}
                      className="flex items-center gap-1 text-[13px] font-bold text-gray-400 transition hover:text-brand-600 dark:hover:text-violet-300"
                    >
                      <Eye size={14} /> View
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(undefined); }} title={editing ? "Edit student" : "Add student"} wide>
        <StudentForm
          initial={editing}
          departments={departments}
          saving={mutating}
          onCancel={() => { setModalOpen(false); setEditing(undefined); }}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={handleDelete}
        title="Delete student"
        message={`Remove ${deleting?.name} (${deleting?.rollNumber}) from the roster? This also deletes their face registration and cannot be undone.`}
      />
    </div>
  );
}
