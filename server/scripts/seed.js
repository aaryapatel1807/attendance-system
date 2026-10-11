/**
 * npm run seed — idempotent seed data for the Face Recognition Attendance System.
 *
 * Creates: 1 admin, 2 teachers, 4 departments, 6 classes, 24 students
 * (mixed faceRegistered), and 14 days of attendance history with confidences.
 * Safe to run repeatedly: everything upserts on its natural unique key.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Teacher } from "../src/models/Teacher.js";
import { Department } from "../src/models/Department.js";
import { Class } from "../src/models/Class.js";
import { Student } from "../src/models/Student.js";
import { Attendance } from "../src/models/Attendance.js";
import { todayStr, daysAgo } from "../src/utils/helpers.js";

// Deterministic PRNG so re-seeds produce identical history (idempotent).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261011);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/face_attendance";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil"];

const TEACHERS = [
  { name: "Professor Sharma", email: "sharma@college.edu", password: "teacher123", department: "Computer Science" },
  { name: "Dr. Meera Iyer", email: "meera@college.edu", password: "teacher123", department: "Electronics" },
];

const CLASSES = [
  { name: "CS-5A", department: "Computer Science", semester: 5, subject: "Data Structures", teacher: "sharma@college.edu", schedule: "Mon, Wed, Fri · 09:30" },
  { name: "CS-3B", department: "Computer Science", semester: 3, subject: "Database Systems", teacher: "sharma@college.edu", schedule: "Tue, Thu · 11:00" },
  { name: "EC-4A", department: "Electronics", semester: 4, subject: "Signals & Systems", teacher: "meera@college.edu", schedule: "Mon, Wed · 10:00" },
  { name: "EC-2A", department: "Electronics", semester: 2, subject: "Circuit Theory", teacher: "meera@college.edu", schedule: "Tue, Fri · 09:30" },
  { name: "ME-3A", department: "Mechanical", semester: 3, subject: "Thermodynamics", teacher: "meera@college.edu", schedule: "Mon, Thu · 14:00" },
  { name: "CE-2A", department: "Civil", semester: 2, subject: "Structural Mechanics", teacher: "sharma@college.edu", schedule: "Wed, Fri · 14:00" },
];

const FIRST = ["Aarav", "Diya", "Kabir", "Ananya", "Vivaan", "Ishita", "Arjun", "Meera", "Rohan", "Sanya", "Aditya", "Priya", "Karan", "Neha", "Yash", "Riya", "Dev", "Tanvi", "Nikhil", "Pooja", "Farhan", "Zara", "Imran", "Kavya"];
const LAST = ["Patel", "Sharma", "Singh", "Gupta", "Reddy", "Nair", "Khan", "Iyer", "Mehta", "Joshi", "Das", "Kulkarni", "Verma", "Rao", "Chopra", "Bose"];
const PREFIX = { "Computer Science": "CS", Electronics: "EC", Mechanical: "ME", Civil: "CE" };

function buildStudents() {
  const students = [];
  let i = 0;
  const seqByDept = {};
  const plan = [
    { department: "Computer Science", semester: 5, count: 3 },
    { department: "Computer Science", semester: 3, count: 3 },
    { department: "Electronics", semester: 4, count: 3 },
    { department: "Electronics", semester: 2, count: 3 },
    { department: "Mechanical", semester: 3, count: 6 },
    { department: "Civil", semester: 2, count: 6 },
  ];
  for (const { department, semester, count } of plan) {
    for (let k = 0; k < count; k += 1) {
      const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
      seqByDept[department] = (seqByDept[department] || 0) + 1;
      const rollNumber = `${PREFIX[department]}2024${String(seqByDept[department]).padStart(3, "0")}`;
      students.push({
        rollNumber,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${rollNumber.slice(-3)}@college.edu`,
        phone: `9${String(100000000 + Math.floor(rand() * 899999999))}`,
        department,
        semester,
        photo: "",
        // ~2/3 registered, so the demo shows both states
        faceRegistered: i % 3 !== 2,
      });
      i += 1;
    }
  }
  return students;
}

async function upsert(model, filter, doc) {
  return model.findOneAndUpdate(filter, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function main() {
  await connectDb(MONGO_URI);
  console.log("Connected to MongoDB");

  // Admin
  await upsert(
    User,
    { email: "admin@college.edu" },
    { name: "Admin", email: "admin@college.edu", passwordHash: await bcrypt.hash("admin123", 10), role: "admin" }
  );

  // Teachers
  const teacherByEmail = {};
  for (const t of TEACHERS) {
    const doc = await upsert(
      Teacher,
      { email: t.email },
      { name: t.name, email: t.email, passwordHash: await bcrypt.hash(t.password, 10), department: t.department }
    );
    teacherByEmail[t.email] = doc;
  }

  // Departments
  for (const name of DEPARTMENTS) {
    await upsert(Department, { name }, { name });
  }

  // Classes
  const classDocs = [];
  for (const c of CLASSES) {
    const doc = await upsert(
      Class,
      { name: c.name },
      {
        name: c.name,
        department: c.department,
        semester: c.semester,
        subject: c.subject,
        teacherId: teacherByEmail[c.teacher]._id,
        schedule: c.schedule,
      }
    );
    classDocs.push(doc);
  }

  // Students
  const studentDocs = [];
  for (const s of buildStudents()) {
    const doc = await upsert(Student, { rollNumber: s.rollNumber }, s);
    studentDocs.push(doc);
  }

  // 14 days of attendance (skip Sundays — college is closed)
  const classHour = { "CS-5A": "09", "CS-3B": "11", "EC-4A": "10", "EC-2A": "09", "ME-3A": "14", "CE-2A": "14" };
  let records = 0;
  for (let d = 13; d >= 0; d -= 1) {
    const date = todayStr(daysAgo(d));
    const [y, m, day] = date.split("-").map(Number);
    if (new Date(y, m - 1, day).getDay() === 0) continue; // Sunday
    for (const cls of classDocs) {
      const roster = studentDocs.filter(
        (s) => s.department === cls.department && s.semester === cls.semester
      );
      const hour = classHour[cls.name] || "09";
      for (const s of roster) {
        const present = rand() < 0.88;
        const time = `${hour}:${String(Math.floor(rand() * 45)).padStart(2, "0")}`;
        await upsert(
          Attendance,
          { studentId: s._id, classId: cls._id, date },
          {
            studentId: s._id,
            classId: cls._id,
            subject: cls.subject,
            date,
            status: present ? "present" : "absent",
            time,
            confidence: present ? Math.round((0.75 + rand() * 0.23) * 100) / 100 : null,
          }
        );
        records += 1;
      }
    }
  }

  console.log(`Seeded: 1 admin, ${TEACHERS.length} teachers, ${DEPARTMENTS.length} departments, ${classDocs.length} classes, ${studentDocs.length} students, ${records} attendance records.`);
  console.log("\nCredentials:");
  console.log("  admin   → admin@college.edu  / admin123");
  console.log("  teacher → sharma@college.edu / teacher123  (Professor Sharma)");
  console.log("  teacher → meera@college.edu  / teacher123  (Dr. Meera Iyer)");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
