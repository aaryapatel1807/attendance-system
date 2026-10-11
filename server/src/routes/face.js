import { Router } from "express";
import { Student } from "../models/Student.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, isValidObjectId } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";
import { callAi } from "../utils/ai.js";

const router = Router();
router.use(authRequired);

// POST /api/face/register  { studentId, images: [data-url] }  (admin)
router.post(
  "/register",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { studentId, images } = req.body || {};
    if (!studentId || !isValidObjectId(studentId)) throw httpError(400, "studentId is required");
    if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
      throw httpError(400, "images must be an array of 1–5 data-URL images");
    }
    const student = await Student.findById(studentId);
    if (!student) throw httpError(404, "Student not found");

    const result = await callAi("/register-face", {
      student_id: student.rollNumber,
      images,
    });

    student.faceRegistered = true;
    await student.save();
    res.json({ ok: true, faceRegistered: true, ...result });
  })
);

// POST /api/face/recognize  { image }  (admin, teacher)
router.post(
  "/recognize",
  requireRole("admin", "teacher"),
  asyncHandler(async (req, res) => {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") throw httpError(400, "image data-URL is required");

    const result = await callAi("/recognize", { image });
    const matches = Array.isArray(result.matches) ? result.matches : [];

    const rollNumbers = [...new Set(matches.map((m) => m.student_id).filter(Boolean))];
    const students = await Student.find({ rollNumber: { $in: rollNumbers } });
    const byRoll = new Map(students.map((s) => [s.rollNumber, s]));

    const enriched = matches.map((m) => {
      const s = byRoll.get(m.student_id);
      return {
        studentId: s ? s.id : null,
        name: s ? s.name : null,
        rollNumber: m.student_id,
        department: s ? s.department : null,
        photo: s ? s.photo : null,
        confidence: m.confidence,
        bbox: m.bbox,
      };
    });

    res.json({
      matches: enriched,
      unknown: Array.isArray(result.unknown) ? result.unknown.map((u) => ({ bbox: u.bbox })) : [],
    });
  })
);

export default router;
