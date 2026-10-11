import { Router } from "express";
import PDFDocument from "pdfkit";
import { Attendance } from "../models/Attendance.js";
import { Class } from "../models/Class.js";
import { authRequired, requireRole } from "../middleware/auth.js";
import { asyncHandler, todayStr, daysAgo, shortDayName, round1 } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(authRequired, requireRole("admin", "teacher"));

function rangeDays(range) {
  if (range === "monthly") return 30;
  if (range === "weekly" || !range) return 7;
  throw httpError(400, 'range must be "weekly" or "monthly"');
}

/** Records in scope for a range + optional department/subject filters. */
async function scopedRecords({ range, department, subject }) {
  const n = rangeDays(range);
  const to = todayStr();
  const from = todayStr(daysAgo(n - 1));

  const classFilter = {};
  if (department) classFilter.department = department;
  const classes = await Class.find(classFilter).select("_id name department");
  const classIds = new Set(classes.map((c) => String(c._id)));
  const metaByClass = new Map(classes.map((c) => [String(c._id), c]));

  const recFilter = {
    classId: { $in: classes.map((c) => c._id) },
    date: { $gte: from, $lte: to },
  };
  if (subject) recFilter.subject = subject;

  const recs = await Attendance.find(recFilter)
    .populate("studentId", "name rollNumber")
    .select("studentId classId subject date status time confidence")
    .sort({ date: -1, time: -1 });

  // If a department filter was given but a record's class isn't in scope, drop it
  // (keeps things correct when subject filter matches across classes).
  return { recs: recs.filter((r) => classIds.has(String(r.classId))), from, to, n, metaByClass };
}

function summarize(recs) {
  const present = recs.filter((r) => r.status === "present").length;
  const absent = recs.length - present;
  const confs = recs.filter((r) => typeof r.confidence === "number").map((r) => r.confidence);
  return {
    present,
    absent,
    total: recs.length,
    percent: recs.length ? round1((present / recs.length) * 100) : 0,
    avgConfidence: confs.length ? round1((confs.reduce((a, b) => a + b, 0) / confs.length) * 100) : 0,
  };
}

// GET /api/reports?range=weekly|monthly&department=&subject=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { range, department, subject } = req.query;
    const { recs, from, to, n, metaByClass } = await scopedRecords({ range, department, subject });

    const dayBuckets = new Map();
    for (let i = n - 1; i >= 0; i -= 1) {
      const d = todayStr(daysAgo(i));
      dayBuckets.set(d, { date: d, day: shortDayName(d), present: 0, absent: 0 });
    }
    const byDept = new Map();
    const bySubject = new Map();

    for (const r of recs) {
      const b = dayBuckets.get(r.date);
      if (b) b[r.status === "present" ? "present" : "absent"] += 1;
      const dept = metaByClass.get(String(r.classId))?.department || "Other";
      const dd = byDept.get(dept) || { department: dept, present: 0, absent: 0 };
      dd[r.status === "present" ? "present" : "absent"] += 1;
      byDept.set(dept, dd);
      const sb = bySubject.get(r.subject) || { subject: r.subject, present: 0, absent: 0 };
      sb[r.status === "present" ? "present" : "absent"] += 1;
      bySubject.set(r.subject, sb);
    }

    const pct = (p, a) => (p + a ? Math.round((p / (p + a)) * 100) : 0);

    res.json({
      range: range || "weekly",
      from,
      to,
      summary: summarize(recs),
      daily: [...dayBuckets.values()],
      byDepartment: [...byDept.values()].map((d) => ({
        ...d,
        total: d.present + d.absent,
        percent: pct(d.present, d.absent),
      })),
      bySubject: [...bySubject.values()].map((s) => ({
        ...s,
        total: s.present + s.absent,
        percent: pct(s.present, s.absent),
      })),
      heatmap: [...dayBuckets.values()].map((d) => ({
        date: d.date,
        percent: pct(d.present, d.absent),
      })),
    });
  })
);

// GET /api/reports/export?format=csv|pdf&range=&department=&subject=
router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { format, range, department, subject } = req.query;
    if (format !== "csv" && format !== "pdf") {
      throw httpError(400, 'format must be "csv" or "pdf"');
    }
    const { recs, from, to, metaByClass } = await scopedRecords({ range, department, subject });
    const summary = summarize(recs);
    const stamp = todayStr();

    if (format === "csv") {
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = "Date,Class,Subject,Roll Number,Name,Department,Status,Time,Confidence";
      const lines = recs.map((r) =>
        [
          r.date,
          metaByClass.get(String(r.classId))?.name || "",
          r.subject,
          r.studentId?.rollNumber || "",
          r.studentId?.name || "",
          metaByClass.get(String(r.classId))?.department || "",
          r.status,
          r.time || "",
          r.confidence ?? "",
        ]
          .map(esc)
          .join(",")
      );
      const csv = [header, ...lines].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="attendance-report-${stamp}.csv"`);
      return res.send(csv);
    }

    // PDF via pdfkit
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-report-${stamp}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor("#1e1b4b").text("Attendance Report", { underline: false });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#6b7280").text(`Period: ${from} → ${to}${department ? `  ·  Dept: ${department}` : ""}${subject ? `  ·  Subject: ${subject}` : ""}`);
    doc.moveDown(0.8);
    doc.fontSize(12).fillColor("#111827");
    doc.text(`Present: ${summary.present}    Absent: ${summary.absent}    Total: ${summary.total}    Attendance: ${summary.percent}%`);
    doc.moveDown(0.8);

    // Simple table
    const colX = [48, 108, 208, 288, 408, 478];
    const headers = ["Date", "Class", "Roll No", "Name", "Status", "Time"];
    const rowH = 18;
    let y = doc.y;
    const drawHeader = () => {
      doc.fontSize(9).fillColor("#ffffff");
      doc.rect(48, y, 500, rowH).fill("#4f46e5");
      headers.forEach((h, i) => doc.text(h, colX[i], y + 5));
      y += rowH;
    };
    drawHeader();
    doc.fontSize(8).fillColor("#111827");
    for (const r of recs.slice(0, 400)) {
      if (y > 760) {
        doc.addPage();
        y = 48;
        drawHeader();
        doc.fontSize(8).fillColor("#111827");
      }
      if (Math.floor((y - 48) / rowH) % 2 === 0) doc.rect(48, y, 500, rowH).fill("#f8fafc");
      const clsName = metaByClass.get(String(r.classId))?.name || "";
      const cells = [r.date, clsName, r.studentId?.rollNumber || "", r.studentId?.name || "", r.status, r.time || ""];
      doc.fillColor(r.status === "present" ? "#15803d" : "#b91c1c");
      cells.forEach((c, i) => {
        const w = (colX[i + 1] || 548) - colX[i] - 4;
        doc.fillColor("#111827").text(String(c).slice(0, 28), colX[i], y + 5, { width: w });
      });
      y += rowH;
    }
    if (recs.length > 400) {
      doc.moveDown();
      doc.fontSize(9).fillColor("#6b7280").text(`…and ${recs.length - 400} more records (see CSV export for the full list).`);
    }
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#6b7280").text(`Generated ${stamp} · Face Recognition Attendance System`);
    doc.end();
  })
);

export default router;
