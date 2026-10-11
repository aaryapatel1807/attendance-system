import { Router } from "express";
import { Student } from "../models/Student.js";
import { Attendance } from "../models/Attendance.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, round1 } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired, requireRole("student"));

/** Resolve the logged-in student from the JWT — never from client input. */
async function selfStudent(req) {
  const student = await Student.findById(req.user.id);
  if (!student) throw httpError(401, "Student account no longer exists");
  return student;
}

// GET /api/portal/me — own profile (password is select:false, never returned)
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const s = (await selfStudent(req)).toJSON();
    res.json({
      id: s.id,
      rollNumber: s.rollNumber,
      name: s.name,
      email: s.email,
      phone: s.phone,
      department: s.department,
      semester: s.semester,
      photo: s.photo,
      faceRegistered: s.faceRegistered,
    });
  })
);

// GET /api/portal/attendance — own attendance summary + history
router.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const student = await selfStudent(req);
    const records = await Attendance.find({ studentId: student._id }).sort({
      date: -1,
      time: -1,
    });
    const present = records.filter((r) => r.status === "present").length;
    const total = records.length;
    res.json({
      percent: total ? round1((present / total) * 100) : 0,
      present,
      absent: total - present,
      total,
      history: records.map((r) => ({
        date: r.date,
        subject: r.subject,
        status: r.status,
        time: r.time,
      })),
    });
  })
);

export default router;
