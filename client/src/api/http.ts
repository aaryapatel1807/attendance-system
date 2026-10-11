import axios, { type AxiosInstance, type AxiosError } from "axios";

export const TOKEN_KEY = "fats_token";

const baseURL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(err)) {
    return err.response?.data?.error ?? err.message ?? "Something went wrong";
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

/** GET an export endpoint and force a file download in the browser. */
export async function downloadExport(format: "csv" | "pdf", params: Record<string, string>) {
  const res = await http.get("/reports/export", {
    params: { format, ...params },
    responseType: "blob",
  });
  const blob = new Blob([res.data], {
    type: format === "csv" ? "text/csv" : "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
