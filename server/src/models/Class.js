import mongoose from "mongoose";
import { clientTransform } from "../utils/helpers.js";

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    subject: { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    schedule: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);
clientTransform(classSchema);

export const Class = mongoose.model("Class", classSchema);
