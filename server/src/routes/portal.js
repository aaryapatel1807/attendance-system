import { Router } from "express";
import { Student } from "../models/Student.js";
import { Attendance } from "../models/Attendance.js";
import { Class } from "../models/Class.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, isValidObjectId, localTimeHHmm, round1, todayStr } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";
import { callAi } from "../utils/ai.js";

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

// POST /api/portal/verify-face  { image: "data-url" }
// Face VERIFICATION for the logged-in student: "is this me?".
// Never marks attendance. Never reveals any other student's data.
// The AI service keys embeddings by rollNumber (see /api/face/register),
// so the top match's `student_id` is compared against the student's own rollNumber.
router.post(
  "/verify-face",
  asyncHandler(async (req, res) => {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") throw httpError(400, "image data-URL is required");

    const student = await selfStudent(req);

    const result = await callAi("/recognize", { image });
    const matches = Array.isArray(result.matches) ? result.matches : [];
    const unknown = Array.isArray(result.unknown) ? result.unknown : [];

    // No face detected at all
    if (matches.length === 0 && unknown.length === 0) {
      return res.json({ verified: false, reason: "no_face" });
    }

    const top = matches[0] || null;

    // Face detected, but it matches nobody enrolled
    if (!top || !top.student_id) {
      return res.json({ verified: false, reason: "no_match" });
    }

    // Match found — is it the logged-in student?
    if (top.student_id === student.rollNumber) {
      return res.json({
        verified: true,
        confidence: top.confidence,
        student: { name: student.name, rollNumber: student.rollNumber, photo: student.photo },
      });
    }

    // Matches a DIFFERENT student — reveal nothing about them
    return res.json({ verified: false, reason: "not_you" });
  })
);

// POST /api/portal/enroll-face  { images: ["data-url", ...] }  (1..50)
// Camera-guided self-enrollment: the student's own face samples are registered
// under their rollNumber (same convention as /api/face/register).
router.post(
  "/enroll-face",
  asyncHandler(async (req, res) => {
    const { images } = req.body || {};
    if (!Array.isArray(images) || images.length < 1 || images.length > 50) {
      throw httpError(400, "images must be an array of 1–50 data-URL images");
    }

    const student = await selfStudent(req);

    const result = await callAi("/register-face", {
      student_id: student.rollNumber,
      images,
    });

    student.faceRegistered = true;
    await student.save();
    res.json({ success: true, faces_found: result.faces_found });
  })
);

// GET /api/portal/classes — classes matching the student's own department + semester
router.get(
  "/classes",
  asyncHandler(async (req, res) => {
    const student = await selfStudent(req);
    const docs = await Class.find({
      department: student.department,
      semester: student.semester,
    })
      .populate("teacherId", "name")
      .sort({ name: 1 });
    res.json({
      data: docs.map((c) => {
        const j = c.toJSON();
        return {
          id: j.id,
          name: j.name,
          subject: j.subject,
          teacherName:
            c.teacherId && typeof c.teacherId === "object" ? c.teacherId.name : null,
          schedule: j.schedule,
        };
      }),
    });
  })
);

// POST /api/portal/mark-attendance  { image: "data-url", classId }
// One-tap self attendance: the face must match the LOGGED-IN student's own
// enrolled face, and the class must belong to their department + semester.
router.post(
  "/mark-attendance",
  asyncHandler(async (req, res) => {
    const { image, classId } = req.body || {};
    if (!image || typeof image !== "string") throw httpError(400, "image data-URL is required");
    if (!classId || !isValidObjectId(classId)) throw httpError(400, "classId is required");

    const student = await selfStudent(req);

    const cls = await Class.findById(classId);
    if (!cls || cls.department !== student.department || cls.semester !== student.semester) {
      throw httpError(403, "You are not enrolled in this class");
    }

    const result = await callAi("/recognize", { image });
    const matches = Array.isArray(result.matches) ? result.matches : [];
    const unknown = Array.isArray(result.unknown) ? result.unknown : [];

    if (matches.length === 0 && unknown.length === 0) {
      return res.json({ marked: false, reason: "no_face" });
    }
    const top = matches[0] || null;
    if (!top || !top.student_id) {
      return res.json({ marked: false, reason: "no_match" });
    }
    if (top.student_id !== student.rollNumber) {
      return res.json({ marked: false, reason: "not_you" });
    }

    const date = todayStr();
    const confidence =
      typeof top.confidence === "number" ? Math.min(1, Math.max(0, top.confidence)) : null;
    await Attendance.findOneAndUpdate(
      { studentId: student._id, classId: cls._id, date },
      {
        $set: {
          subject: cls.subject,
          status: "present",
          time: localTimeHHmm(),
          confidence,
        },
      },
      { upsert: true }
    );

    res.json({ marked: true, confidence, subject: cls.subject });
  })
);

export default router;
