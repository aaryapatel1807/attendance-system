import mongoose from "mongoose";
import { clientTransform } from "../utils/helpers.js";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject: { type: String, required: true, trim: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    status: { type: String, enum: ["present", "absent"], required: true },
    time: { type: String, default: "", match: /^(\d{2}:\d{2})?$/ }, // HH:mm
    confidence: { type: Number, default: null, min: 0, max: 1 },
  },
  { timestamps: true }
);

// One record per student per class per day — makes POST /api/attendance an upsert.
attendanceSchema.index({ studentId: 1, classId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ classId: 1, date: 1 });
clientTransform(attendanceSchema);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
