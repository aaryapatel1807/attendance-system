import { Router } from "express";
import { Types } from "mongoose";
import { Attendance } from "../models/Attendance.js";
import { Class } from "../models/Class.js";
import { Student } from "../models/Student.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  asyncHandler,
  isValidObjectId,
  todayStr,
  localTimeHHmm,
  parsePagination,
  paginated,
} from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired, requireRole("admin", "teacher"));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// POST /api/attendance
// body: { classId, subject, date, records: [{ studentId, status, confidence }] }
// Upserts one record per (studentId, classId, date). → { saved: n }
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { classId, subject, date, records } = req.body || {};
    if (!classId || !isValidObjectId(classId)) throw httpError(400, "classId is required");
    if (!subject || !String(subject).trim()) throw httpError(400, "subject is required");
    if (!Array.isArray(records) || records.length === 0) {
      throw httpError(400, "records must be a non-empty array");
    }
    const dateStr = date ? String(date) : todayStr();
    if (!DATE_RE.test(dateStr)) throw httpError(400, "date must be YYYY-MM-DD");

    const cls = await Class.findById(classId);
    if (!cls) throw httpError(404, "Class not found");

    const studentIds = [...new Set(records.map((r) => r.studentId).filter(isValidObjectId))];
    if (studentIds.length !== records.length) throw httpError(400, "every record needs a valid studentId");
    const found = await Student.countDocuments({ _id: { $in: studentIds } });
    if (found !== studentIds.length) throw httpError(400, "one or more studentIds do not exist");

    const now = localTimeHHmm();
    let saved = 0;
    for (const r of records) {
      if (r.status !== "present" && r.status !== "absent") {
        throw httpError(400, 'status must be "present" or "absent"');
      }
      const conf =
        r.confidence === undefined || r.confidence === null ? null : Number(r.confidence);
      if (conf !== null && (Number.isNaN(conf) || conf < 0 || conf > 1)) {
        throw httpError(400, "confidence must be between 0 and 1");
      }
      await Attendance.findOneAndUpdate(
        { studentId: r.studentId, classId, date: dateStr },
        {
          $set: {
            subject: String(subject).trim(),
            status: r.status,
            time: r.time && TIME_RE.test(r.time) ? r.time : now,
            confidence: conf,
          },
        },
        { upsert: true }
      );
      saved += 1;
    }
    res.json({ saved });
  })
);

// GET /api/attendance?classId=&date=&from=&to=&status=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { classId, date, from, to, status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (classId) {
      if (!isValidObjectId(classId)) throw httpError(400, "classId is invalid");
      filter.classId = classId;
    }
    if (date) {
      if (!DATE_RE.test(date)) throw httpError(400, "date must be YYYY-MM-DD");
      filter.date = date;
    } else {
      if (from) {
        if (!DATE_RE.test(from)) throw httpError(400, "from must be YYYY-MM-DD");
        filter.date = { ...filter.date, $gte: from };
      }
      if (to) {
        if (!DATE_RE.test(to)) throw httpError(400, "to must be YYYY-MM-DD");
        filter.date = { ...filter.date, $lte: to };
      }
    }
    if (status) {
      if (status !== "present" && status !== "absent") throw httpError(400, 'status must be "present" or "absent"');
      filter.status = status;
    }
    const [total, docs] = await Promise.all([
      Attendance.countDocuments(filter),
      Attendance.find(filter)
        .populate("studentId", "name rollNumber")
        .populate("classId", "name")
        .sort({ date: -1, time: -1 })
        .skip(skip)
        .limit(limit),
    ]);
    const data = docs.map((r) => {
      const j = r.toJSON();
      j.studentName = r.studentId && typeof r.studentId === "object" ? r.studentId.name : null;
      j.rollNumber = r.studentId && typeof r.studentId === "object" ? r.studentId.rollNumber : null;
      j.className = r.classId && typeof r.classId === "object" ? r.classId.name : null;
      j.studentId = r.studentId && typeof r.studentId === "object" ? r.studentId.id : String(r.studentId);
      j.classId = r.classId && typeof r.classId === "object" ? r.classId.id : String(r.classId);
      return j;
    });
    res.json(paginated(data, total, page, limit));
  })
);

// GET /api/attendance/history?classId=
// → { history: [{ date, subject, present, absent, total }] }
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const { classId } = req.query;
    const match = {};
    if (classId) {
      if (!isValidObjectId(classId)) throw httpError(400, "classId is invalid");
      match.classId = new Types.ObjectId(classId);
    }
    const rows = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { date: "$date", subject: "$subject" },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.date": -1 } },
    ]);
    res.json({
      history: rows.map((r) => ({
        date: r._id.date,
        subject: r._id.subject,
        present: r.present,
        absent: r.absent,
        total: r.present + r.absent,
      })),
    });
  })
);

export default router;
