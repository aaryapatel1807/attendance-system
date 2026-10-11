import { Router } from "express";
import { Attendance } from "../models/Attendance.js";
import { Class } from "../models/Class.js";
import { Student } from "../models/Student.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  asyncHandler,
  isValidObjectId,
  todayStr,
  daysAgo,
  shortDayName,
  round1,
  localTimeHHmm,
} from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired, requireRole("admin", "teacher"));

// GET /api/dashboard/stats?classId=
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const { classId } = req.query;
    if (classId && !isValidObjectId(classId)) throw httpError(400, "classId is invalid");

    const today = todayStr();
    const dates = [];
    for (let i = 6; i >= 0; i -= 1) dates.push(todayStr(daysAgo(i)));

    // Classes in scope (optional classId filter) → department lookup
    const classFilter = classId ? { _id: classId } : {};
    const classes = await Class.find(classFilter).select("_id name department semester");
    const classIds = classes.map((c) => c._id);
    const deptByClass = new Map(classes.map((c) => [String(c._id), c.department]));
    const nameByClass = new Map(classes.map((c) => [String(c._id), c.name]));

    const totalStudents = classId
      ? await Student.countDocuments({
          department: classes[0]?.department,
          semester: classes[0]?.semester,
        })
      : await Student.countDocuments();

    // One fetch for the whole 7-day window, group in JS.
    const recs = await Attendance.find({
      classId: { $in: classIds },
      date: { $gte: dates[0], $lte: today },
    }).select("studentId classId date status confidence createdAt");

    const byDate = new Map(dates.map((d) => [d, { present: 0, absent: 0 }]));
    const byDept = new Map(); // dept -> { present, total }
    let todayPresent = 0;
    let todayAbsent = 0;
    let confSum = 0;
    let confCount = 0;

    for (const r of recs) {
      const bucket = byDate.get(r.date);
      if (bucket) bucket[r.status === "present" ? "present" : "absent"] += 1;
      if (r.date === today) {
        if (r.status === "present") {
          todayPresent += 1;
          if (typeof r.confidence === "number") {
            confSum += r.confidence;
            confCount += 1;
          }
        } else {
          todayAbsent += 1;
        }
      }
      const dept = deptByClass.get(String(r.classId)) || "Other";
      const d = byDept.get(dept) || { present: 0, total: 0 };
      if (r.status === "present") d.present += 1;
      d.total += 1;
      byDept.set(dept, d);
    }

    const weeklyTrend = dates.map((d) => ({
      day: shortDayName(d),
      present: byDate.get(d).present,
      absent: byDate.get(d).absent,
    }));

    const departmentBars = [...byDept.entries()].map(([department, d]) => ({
      department,
      percent: d.total ? Math.round((d.present / d.total) * 100) : 0,
    }));

    // Last 5 attendance batches (same class + same date), newest first.
    const batches = new Map(); // `${classId}|${date}` -> { classId, date, count, latest }
    for (const r of recs) {
      const key = `${r.classId}|${r.date}`;
      const b = batches.get(key) || { classId: String(r.classId), date: r.date, count: 0, latest: null };
      b.count += 1;
      if (!b.latest || r.createdAt > b.latest) b.latest = r.createdAt;
      batches.set(key, b);
    }
    const recentActivity = [...batches.values()]
      .sort((a, b) => b.latest - a.latest)
      .slice(0, 5)
      .map((b) => ({
        text: `Attendance saved for ${nameByClass.get(b.classId) || "class"} (${b.count} students)`,
        time: localTimeHHmm(new Date(b.latest)),
        type: "success",
      }));

    res.json({
      totalStudents,
      presentToday: todayPresent,
      absentToday: todayAbsent,
      recognitionAccuracy: confCount ? round1((confSum / confCount) * 100) : 0,
      weeklyTrend,
      departmentBars,
      todayDonut: { present: todayPresent, absent: todayAbsent },
      recentActivity,
    });
  })
);

export default router;
