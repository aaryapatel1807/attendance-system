import { http } from "./http";
import type { ClassItem, Department, Paginated, Teacher } from "../types";

export const resourcesApi = {
  // ---- Teachers (admin) ----
  listTeachers: () => http.get<Teacher[]>("/teachers").then((r) => r.data),
  createTeacher: (data: { name: string; email: string; password: string; department: string }) =>
    http.post<Teacher>("/teachers", data).then((r) => r.data),
  updateTeacher: (id: string, data: Partial<Teacher>) =>
    http.put<Teacher>(`/teachers/${id}`, data).then((r) => r.data),
  deleteTeacher: (id: string) => http.delete(`/teachers/${id}`).then((r) => r.data),

  // ---- Departments ----
  listDepartments: () => http.get<Department[]>("/departments").then((r) => r.data),
  createDepartment: (name: string) =>
    http.post<Department>("/departments", { name }).then((r) => r.data),
  deleteDepartment: (id: string) => http.delete(`/departments/${id}`).then((r) => r.data),

  // ---- Classes ----
  listClasses: () =>
    http.get<Paginated<ClassItem> | ClassItem[]>("/classes").then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : d.data;
    }),
  createClass: (data: Partial<ClassItem>) =>
    http.post<ClassItem>("/classes", data).then((r) => r.data),
  updateClass: (id: string, data: Partial<ClassItem>) =>
    http.put<ClassItem>(`/classes/${id}`, data).then((r) => r.data),
  deleteClass: (id: string) => http.delete(`/classes/${id}`).then((r) => r.data),
};
