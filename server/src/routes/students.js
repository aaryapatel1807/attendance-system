import { Router } from "express";
import { Student } from "../models/Student.js";
import { Attendance } from "../models/Attendance.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, parsePagination, paginated, isValidEmail, isValidObjectId, toISODateTime, round1 } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired);

const readRoles = requireRole("admin", "teacher");
const adminOnly = requireRole("admin");

/** Attendance aggregates per student: { present, total } and latest record. */
async function attendanceMaps(studentIds) {
  const ids = studentIds.map((s) => s);
  const counts = await Attendance.aggregate([
    { $match: { studentId: { $in: ids } } },
    {
      $group: {
        _id: "$studentId",
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);
  const latest = await Attendance.aggregate([
    { $match: { studentId: { $in: ids } } },
    { $sort: { date: -1, time: -1 } },
    { $group: { _id: "$studentId", doc: { $first: "$$ROOT" } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));
  const latestMap = new Map(latest.map((l) => [String(l._id), l.doc]));
  return { countMap, latestMap };
}

function withComputed(student, countMap, latestMap) {
  const j = student.toJSON();
  const c = countMap.get(String(student._id)) || { present: 0, total: 0 };
  j.attendancePercent = c.total ? round1((c.present / c.total) * 100) : 0;
  const l = latestMap.get(String(student._id));
  j.lastAttendance = l ? toISODateTime(l.date, l.time || "00:00") : null;
  return j;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/students?search=&department=&semester=&page=&limit=
router.get(
  "/",
  readRoles,
  asyncHandler(async (req, res) => {
    const { search, department, semester } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: re }, { rollNumber: re }, { email: re }];
    }
    if (department) filter.department = department;
    if (semester) {
      const s = parseInt(semester, 10);
      if (!Number.isNaN(s)) filter.semester = s;
    }
    const [total, docs] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    ]);
    const { countMap, latestMap } = await attendanceMaps(docs.map((d) => d._id));
    res.json(paginated(docs.map((d) => withComputed(d, countMap, latestMap)), total, page, limit));
  })
);

function validateStudentBody(body, partial = false) {
  const { rollNumber, name, department, semester, email, phone } = body || {};
  if (!partial || rollNumber !== undefined) {
    if (!rollNumber || !String(rollNumber).trim()) throw httpError(400, "rollNumber is required");
  }
  if (!partial || name !== undefined) {
    if (!name || !String(name).trim()) throw httpError(400, "name is required");
  }
  if (!partial || department !== undefined) {
    if (!department || !String(department).trim()) throw httpError(400, "department is required");
  }
  if (!partial || semester !== undefined) {
    const s = Number(semester);
    if (!Number.isInteger(s) || s < 1 || s > 8) throw httpError(400, "semester must be an integer 1–8");
  }
  if (email !== undefined && email !== "" && !isValidEmail(email)) {
    throw httpError(400, "email format is invalid");
  }
  if (phone !== undefined && phone !== "" && !/^[+\d][\d\s-]{5,15}$/.test(String(phone))) {
    throw httpError(400, "phone format is invalid");
  }
}

// POST /api/students (admin)
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    validateStudentBody(req.body);
    const exists = await Student.findOne({ rollNumber: String(req.body.rollNumber).trim() });
    if (exists) throw httpError(409, "A student with this rollNumber already exists");
    const student = await Student.create({
      rollNumber: String(req.body.rollNumber).trim(),
      name: String(req.body.name).trim(),
      email: (req.body.email || "").trim(),
      phone: (req.body.phone || "").trim(),
      department: String(req.body.department).trim(),
      semester: Number(req.body.semester),
      photo: req.body.photo || "",
      faceRegistered: Boolean(req.body.faceRegistered),
    });
    res.status(201).json(student.toJSON());
  })
);

function requireObjectId(req) {
  if (!isValidObjectId(req.params.id)) throw httpError(400, "Invalid id");
}

// GET /api/students/:id/stats
router.get(
  "/:id/stats",
  readRoles,
  asyncHandler(async (req, res) => {
    requireObjectId(req);
    const student = await Student.findById(req.params.id);
    if (!student) throw httpError(404, "Student not found");
    const records = await Attendance.find({ studentId: student._id }).sort({ date: -1, time: -1 });
    const present = records.filter((r) => r.status === "present").length;
    const total = records.length;
    res.json({
      percent: total ? round1((present / total) * 100) : 0,
      present,
      absent: total - present,
      total,
      history: records.map((r) => ({ date: r.date, subject: r.subject, status: r.status })),
    });
  })
);

// GET /api/students/:id
router.get(
  "/:id",
  readRoles,
  asyncHandler(async (req, res) => {
    requireObjectId(req);
    const student = await Student.findById(req.params.id);
    if (!student) throw httpError(404, "Student not found");
    const { countMap, latestMap } = await attendanceMaps([student._id]);
    const out = withComputed(student, countMap, latestMap);
    const history = await Attendance.find({ studentId: student._id })
      .sort({ date: -1, time: -1 })
      .limit(100);
    out.attendanceHistory = history.map((r) => ({
      date: r.date,
      subject: r.subject,
      status: r.status,
      time: r.time,
    }));
    res.json(out);
  })
);

// PUT /api/students/:id (admin)
router.put(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    requireObjectId(req);
    validateStudentBody(req.body, true);
    const body = { ...req.body };
    if (body.rollNumber !== undefined) body.rollNumber = String(body.rollNumber).trim();
    if (body.name !== undefined) body.name = String(body.name).trim();
    if (body.department !== undefined) body.department = String(body.department).trim();
    if (body.semester !== undefined) body.semester = Number(body.semester);
    if (body.email !== undefined) body.email = String(body.email).trim();
    if (body.phone !== undefined) body.phone = String(body.phone).trim();
    if (body.rollNumber) {
      const clash = await Student.findOne({ rollNumber: body.rollNumber, _id: { $ne: req.params.id } });
      if (clash) throw httpError(409, "A student with this rollNumber already exists");
    }
    const student = await Student.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!student) throw httpError(404, "Student not found");
    res.json(student.toJSON());
  })
);

// DELETE /api/students/:id (admin)
router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    requireObjectId(req);
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) throw httpError(404, "Student not found");
    await Attendance.deleteMany({ studentId: student._id });
    res.json({ ok: true });
  })
);

export default router;
