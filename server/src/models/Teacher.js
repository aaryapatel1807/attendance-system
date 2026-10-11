import mongoose from "mongoose";
import { clientTransform } from "../utils/helpers.js";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    department: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
clientTransform(teacherSchema);

export const Teacher = mongoose.model("Teacher", teacherSchema);
