import { Router } from "express";
import bcrypt from "bcryptjs";
import { Teacher } from "../models/Teacher.js";
import { Class } from "../models/Class.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, isValidEmail, isValidObjectId, parsePagination, paginated } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired, requireRole("admin"));

async function withAssignedClasses(teacher) {
  const j = teacher.toJSON();
  const classes = await Class.find({ teacherId: teacher._id }).select("_id");
  j.assignedClasses = classes.map((c) => c.id);
  return j;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [total, docs] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.find().sort({ name: 1 }).skip(skip).limit(limit),
    ]);
    const data = await Promise.all(docs.map(withAssignedClasses));
    res.json(paginated(data, total, page, limit));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, password, department } = req.body || {};
    if (!name || !String(name).trim()) throw httpError(400, "name is required");
    if (!email || !isValidEmail(email)) throw httpError(400, "a valid email is required");
    if (!password || String(password).length < 6) throw httpError(400, "password must be at least 6 characters");
    if (!department || !String(department).trim()) throw httpError(400, "department is required");

    const exists = await Teacher.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) throw httpError(409, "A teacher with this email already exists");

    const teacher = await Teacher.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash: await bcrypt.hash(String(password), 10),
      department: String(department).trim(),
    });
    res.status(201).json(await withAssignedClasses(teacher));
  })
);

function requireObjectId(req) {
  if (!isValidObjectId(req.params.id)) throw httpError(400, "Invalid id");
}

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    requireObjectId(req);
    const { name, email, password, department } = req.body || {};
    const update = {};
    if (name !== undefined) {
      if (!String(name).trim()) throw httpError(400, "name cannot be empty");
      update.name = String(name).trim();
    }
    if (email !== undefined) {
      if (!isValidEmail(email)) throw httpError(400, "a valid email is required");
      const clash = await Teacher.findOne({
        email: String(email).toLowerCase().trim(),
        _id: { $ne: req.params.id },
      });
      if (clash) throw httpError(409, "A teacher with this email already exists");
      update.email = String(email).toLowerCase().trim();
    }
    if (password !== undefined && password !== "") {
      if (String(password).length < 6) throw httpError(400, "password must be at least 6 characters");
      update.passwordHash = await bcrypt.hash(String(password), 10);
    }
    if (department !== undefined) {
      if (!String(department).trim()) throw httpError(400, "department cannot be empty");
      update.department = String(department).trim();
    }
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!teacher) throw httpError(404, "Teacher not found");
    res.json(await withAssignedClasses(teacher));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    requireObjectId(req);
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) throw httpError(404, "Teacher not found");
    // Unassign from classes rather than deleting classes.
    await Class.updateMany({ teacherId: teacher._id }, { $set: { teacherId: null } });
    res.json({ ok: true });
  })
);

export default router;
