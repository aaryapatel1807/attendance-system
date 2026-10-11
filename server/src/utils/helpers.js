/** Wrap async route handlers so errors reach the central error handler. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Local YYYY-MM-DD (not UTC) so "today" matches the server's wall clock. */
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgo(n, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

export function shortDayName(dateStr) {
  // dateStr "YYYY-MM-DD" — parse as local to avoid TZ shifts
  const [y, m, d] = dateStr.split("-").map(Number);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(y, m - 1, d).getDay()
  ];
}

/** "YYYY-MM-DD" + "HH:mm" -> ISO string for lastAttendance. */
export function toISODateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export function localTimeHHmm(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Mongoose toJSON: expose `id`, drop `_id`/`__v`. Apply per-schema. */
export function clientTransform(schema) {
  schema.set("toJSON", {
    virtuals: false,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(v) {
  return typeof v === "string" && EMAIL_RE.test(v.trim());
}

export function isValidObjectId(v) {
  return /^[a-fA-F0-9]{24}$/.test(String(v));
}

export function parsePagination(query, defaults = { page: 1, limit: 20 }) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated(data, total, page, limit) {
  return { data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
