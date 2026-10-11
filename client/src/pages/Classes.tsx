import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store";
import { notify } from "../store/slices/notificationsSlice";
import { resourcesApi } from "../api/resources";
import { apiErrorMessage } from "../api/http";
import type { ClassItem, Department, Teacher } from "../types";
import {
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  Select,
  Skeleton,
} from "../components/ui";
import { cn } from "../utils/cn";

type Tab = "classes" | "departments";

function ClassForm({
  initial,
  departments,
  teachers,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: ClassItem;
  departments: Department[];
  teachers: Teacher[];
  onSubmit: (data: Partial<ClassItem>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    department: initial?.department ?? departments[0]?.name ?? "",
    semester: String(initial?.semester ?? 1),
    subject: initial?.subject ?? "",
    teacherId: initial?.teacherId ?? "",
    schedule: initial?.schedule ?? "",
  });
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const teacher = teachers.find((t) => t.id === form.teacherId);
        onSubmit({
          ...form,
          semester: Number(form.semester),
          teacherName: teacher?.name,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Class name">
          <Input value={form.name} onChange={set("name")} placeholder="CS-5A" required />
        </Field>
        <Field label="Subject">
          <Input value={form.subject} onChange={set("subject")} placeholder="Data Structures" required />
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
        <Field label="Assigned teacher">
          <Select value={form.teacherId} onChange={set("teacherId")}>
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Schedule">
          <Input value={form.schedule} onChange={set("schedule")} placeholder="Mon · 09:00 AM" />
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-2xl px-5 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]">
          Cancel
        </button>
        <PrimaryButton type="submit" loading={saving}>
          {initial ? "Save changes" : "Create class"}
        </PrimaryButton>
      </div>
    </form>
  );
}

export default function Classes() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [tab, setTab] = useState<Tab>("classes");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | undefined>();
  const [deleting, setDeleting] = useState<ClassItem | undefined>();
  const [saving, setSaving] = useState(false);
  const [newDept, setNewDept] = useState("");

  const isAdmin = user?.role === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const [c, d, t] = await Promise.all([
        resourcesApi.listClasses(),
        resourcesApi.listDepartments(),
        resourcesApi.listTeachers().catch(() => [] as Teacher[]),
      ]);
      setClasses(c);
      setDepartments(d);
      setTeachers(t);
    } catch (e) {
      dispatch(notify({ type: "error", title: "Failed to load classes", message: apiErrorMessage(e) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (data: Partial<ClassItem>) => {
    setSaving(true);
    try {
      if (editing) await resourcesApi.updateClass(editing.id, data);
      else await resourcesApi.createClass(data);
      dispatch(notify({ type: "success", title: editing ? "Class updated" : "Class created", message: data.name }));
      setModalOpen(false);
      setEditing(undefined);
      load();
    } catch (e) {
      dispatch(notify({ type: "error", title: "Save failed", message: apiErrorMessage(e) }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await resourcesApi.deleteClass(deleting.id);
      dispatch(notify({ type: "success", title: "Class deleted", message: deleting.name }));
      setDeleting(undefined);
      load();
    } catch (e) {
      dispatch(notify({ type: "error", title: "Delete failed", message: apiErrorMessage(e) }));
    }
  };

  const addDepartment = async () => {
    if (!newDept.trim()) return;
    try {
      await resourcesApi.createDepartment(newDept.trim());
      setNewDept("");
      load();
      dispatch(notify({ type: "success", title: "Department added", message: newDept.trim() }));
    } catch (e) {
      dispatch(notify({ type: "error", title: "Add failed", message: apiErrorMessage(e) }));
    }
  };

  const removeDepartment = async (d: Department) => {
    try {
      await resourcesApi.deleteDepartment(d.id);
      load();
      dispatch(notify({ type: "success", title: "Department removed", message: d.name }));
    } catch (e) {
      dispatch(notify({ type: "error", title: "Delete failed", message: apiErrorMessage(e) }));
    }
  };

  return (
    <div>
      <PageHeader
        title="Classes & Departments"
        subtitle="Organize classrooms, subjects and departments"
        actions={
          isAdmin && tab === "classes" ? (
            <PrimaryButton onClick={() => { setEditing(undefined); setModalOpen(true); }}>
              <Plus size={18} /> New Class
            </PrimaryButton>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-2xl bg-white p-1.5 card-shadow dark:bg-night-850 dark:border dark:border-white/[0.06]">
        {(["classes", "departments"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative rounded-xl px-6 py-2.5 text-sm font-bold capitalize transition",
              tab === t ? "text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            {tab === t && (
              <motion.span layoutId="tab-active" className="grad-brand absolute inset-0 rounded-xl" transition={{ type: "spring", damping: 28, stiffness: 360 }} />
            )}
            <span className="relative z-10">{t}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[220px] !rounded-[24px]" />
          ))}
        </div>
      ) : tab === "classes" ? (
        classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes yet"
            message="Create your first class to start taking attendance."
            action={isAdmin ? (
              <PrimaryButton onClick={() => { setEditing(undefined); setModalOpen(true); }}>
                <Plus size={18} /> New Class
              </PrimaryButton>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {classes.map((c, i) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                  className="card-hover rounded-[24px] bg-white p-6 card-shadow dark:bg-night-850 dark:border dark:border-white/[0.06]"
                >
                  <div className="flex items-start justify-between">
                    <div className="grad-brand flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                      <BookOpen size={22} />
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(c); setModalOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-indigo-50 hover:text-brand-600 dark:hover:bg-white/[0.06]" aria-label="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleting(c)} className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-[18px] font-extrabold text-gray-900 dark:text-white">{c.name}</h3>
                  <p className="text-sm font-medium text-brand-600 dark:text-violet-300">{c.subject}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{c.department}</Badge>
                    <Badge tone="neutral">Sem {c.semester}</Badge>
                  </div>
                  <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-[13px] text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
                    <p className="flex items-center gap-2"><User size={14} /> {c.teacherName ?? "Unassigned"}</p>
                    {c.schedule && <p className="flex items-center gap-2"><CalendarClock size={14} /> {c.schedule}</p>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : (
        <Card className="p-6 sm:p-7">
          {isAdmin && (
            <div className="mb-5 flex gap-3">
              <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="New department name…" className="max-w-sm" onKeyDown={(e) => e.key === "Enter" && addDepartment()} />
              <PrimaryButton onClick={addDepartment}><Plus size={18} /> Add</PrimaryButton>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-[20px] bg-gray-50 px-5 py-4 dark:bg-white/[0.04]">
                <span className="flex items-center gap-3 font-bold text-gray-800 dark:text-gray-100">
                  <LayoutGrid size={18} className="text-brand-600 dark:text-violet-300" />
                  {d.name}
                </span>
                {isAdmin && (
                  <button onClick={() => removeDepartment(d)} className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" aria-label={`Delete ${d.name}`}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {departments.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No departments yet.</p>
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(undefined); }} title={editing ? "Edit class" : "New class"} wide>
        <ClassForm
          initial={editing}
          departments={departments}
          teachers={teachers}
          saving={saving}
          onCancel={() => { setModalOpen(false); setEditing(undefined); }}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={handleDelete}
        title="Delete class"
        message={`Delete class ${deleting?.name} (${deleting?.subject})? Attendance records for this class will be affected.`}
      />
    </div>
  );
}
