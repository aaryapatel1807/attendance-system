import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Teacher } from "../models/Teacher.js";
import { Student } from "../models/Student.js";
import { authRequired, signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";
import { httpError } from "../middleware/errorHandler.js";

const router = Router();

function publicUser(doc, role) {
  const j = doc.toJSON();
  return { id: j.id, name: j.name, email: j.email, role };
}

/**
 * Find an account by identifier. Staff use email; students may use
 * rollNumber (e.g. CS2024001) or email. Lookup order: admin users,
 * teachers, then students.
 */
async function findAccount(identifier) {
  const email = String(identifier).toLowerCase().trim();
  const user = await User.findOne({ email }).select("+passwordHash");
  if (user) return { doc: user, role: user.role, hash: user.passwordHash };
  const teacher = await Teacher.findOne({ email }).select("+passwordHash");
  if (teacher) return { doc: teacher, role: "teacher", hash: teacher.passwordHash };
  const student = await Student.findOne({
    $or: [
      { rollNumber: String(identifier).trim().toUpperCase() },
      { email },
    ],
  }).select("+password");
  if (student && student.password) {
    return { doc: student, role: "student", hash: student.password };
  }
  return null;
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw httpError(400, "Email and password are required");

    const account = await findAccount(email);
    if (!account) throw httpError(401, "Invalid email or password");

    const ok = await bcrypt.compare(String(password), account.hash);
    if (!ok) throw httpError(401, "Invalid email or password");

    const user = publicUser(account.doc, account.role);
    res.json({ token: signToken(user), user });
  })
);

router.post("/logout", (_req, res) => {
  // Stateless JWT — client discards the token.
  res.json({ ok: true });
});

router.get(
  "/me",
  authRequired,
  asyncHandler(async (req, res) => {
    let doc = null;
    let role = req.user.role;
    if (role === "admin") {
      doc = await User.findById(req.user.id);
    } else if (role === "teacher") {
      doc = await Teacher.findById(req.user.id);
      role = "teacher";
    } else {
      doc = await Student.findById(req.user.id);
      role = "student";
    }
    if (!doc) throw httpError(401, "Account no longer exists");
    res.json({ user: publicUser(doc, role) });
  })
);

export default router;
