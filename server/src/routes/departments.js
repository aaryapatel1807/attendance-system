import { Router } from "express";
import { Department } from "../models/Department.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, isValidObjectId, parsePagination, paginated } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired);

router.get(
  "/",
  requireRole("admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [total, docs] = await Promise.all([
      Department.countDocuments(),
      Department.find().sort({ name: 1 }).skip(skip).limit(limit),
    ]);
    res.json(paginated(docs.map((d) => d.toJSON()), total, page, limit));
  })
);

router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) throw httpError(400, "name is required");
    const exists = await Department.findOne({ name: String(name).trim() });
    if (exists) throw httpError(409, "Department already exists");
    const dept = await Department.create({ name: String(name).trim() });
    res.status(201).json(dept.toJSON());
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw httpError(400, "Invalid id");
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) throw httpError(404, "Department not found");
    res.json({ ok: true });
  })
);

export default router;
