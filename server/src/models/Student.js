import mongoose from "mongoose";
import { clientTransform } from "../utils/helpers.js";

const studentSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    department: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    photo: { type: String, default: "" },
    faceRegistered: { type: Boolean, default: false },
    // Portal login credential (bcrypt hash). select:false so it never leaks in queries.
    password: { type: String, select: false },
  },
  { timestamps: true }
);
clientTransform(studentSchema);

export const Student = mongoose.model("Student", studentSchema);
