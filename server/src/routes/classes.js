import { Router } from "express";
import { Class } from "../models/Class.js";
import { Teacher } from "../models/Teacher.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, isValidObjectId, parsePagination, paginated } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired);

async function toClient(cls) {
  const j = cls.toJSON();
  j.teacherName = cls.teacherId && typeof cls.teacherId === "object" ? cls.teacherId.name : null;
  j.teacherId = cls.teacherId && typeof cls.teacherId === "object" ? cls.teacherId.id : cls.teacherId ? String(cls.teacherId) : null;
  return j;
}

router.get(
  "/",
  requireRole("admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [total, docs] = await Promise.all([
      Class.countDocuments(),
      Class.find().populate("teacherId", "name").sort({ name: 1 }).skip(skip).limit(limit),
    ]);
    res.json(paginated(await Promise.all(docs.map(toClient)), total, page, limit));
  })
);

function validateClassBody(body, partial = false) {
  const { name, department, semester, subject, teacherId } = body || {};
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
  if (!partial || subject !== undefined) {
    if (!subject || !String(subject).trim()) throw httpError(400, "subject is required");
  }
  if (teacherId !== undefined && teacherId !== null && teacherId !== "") {
    if (!isValidObjectId(teacherId)) throw httpError(400, "teacherId is invalid");
  }
}

async function resolveTeacher(teacherId) {
  if (!teacherId) return null;
  const t = await Teacher.findById(teacherId);
  if (!t) throw httpError(400, "teacherId does not match any teacher");
  return t._id;
}

router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    validateClassBody(req.body);
    const exists = await Class.findOne({ name: String(req.body.name).trim() });
    if (exists) throw httpError(409, "A class with this name already exists");
    const cls = await Class.create({
      name: String(req.body.name).trim(),
      department: String(req.body.department).trim(),
      semester: Number(req.body.semester),
      subject: String(req.body.subject).trim(),
      teacherId: await resolveTeacher(req.body.teacherId),
      schedule: (req.body.schedule || "").trim(),
    });
    await cls.populate("teacherId", "name");
    res.status(201).json(await toClient(cls));
  })
);

router.put(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw httpError(400, "Invalid id");
    validateClassBody(req.body, true);
    const update = {};
    for (const k of ["name", "department", "subject", "schedule"]) {
      if (req.body[k] !== undefined) {
        if (k !== "schedule" && !String(req.body[k]).trim()) throw httpError(400, `${k} cannot be empty`);
        update[k] = String(req.body[k]).trim();
      }
    }
    if (req.body.semester !== undefined) update.semester = Number(req.body.semester);
    if (req.body.teacherId !== undefined) {
      update.teacherId = req.body.teacherId ? await resolveTeacher(req.body.teacherId) : null;
    }
    if (update.name) {
      const clash = await Class.findOne({ name: update.name, _id: { $ne: req.params.id } });
      if (clash) throw httpError(409, "A class with this name already exists");
    }
    const cls = await Class.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("teacherId", "name");
    if (!cls) throw httpError(404, "Class not found");
    res.json(await toClient(cls));
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw httpError(400, "Invalid id");
    const cls = await Class.findByIdAndDelete(req.params.id);
    if (!cls) throw httpError(404, "Class not found");
    res.json({ ok: true });
  })
);

export default router;
