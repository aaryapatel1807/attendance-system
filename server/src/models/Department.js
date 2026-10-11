import mongoose from "mongoose";
import { clientTransform } from "../utils/helpers.js";

const departmentSchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);
clientTransform(departmentSchema);

export const Department = mongoose.model("Department", departmentSchema);
