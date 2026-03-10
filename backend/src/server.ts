import dotenv from "dotenv";
dotenv.config();

// 🔎 DEBUG: show which database Prisma is using
console.log("DATABASE_URL =", process.env.DATABASE_URL);

import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./prisma/client";

import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";
import studentRoutes from "./routes/studentRoutes";
import { assessmentRoutes } from "./routes/assessmentRoutes";
import gradebookRoutes from "./routes/gradebookRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

// ✅ Assignment Categories
import assignmentCategoryRoutes from "./routes/assignmentCategory.routes";

// ✅ Terms route (STANDARDIZED)
import termRoutes from "./routes/termRoutes";

// ✅ Admin routes
import adminAuditLogRoutes from "./routes/admin.auditLogs.routes";
import adminUsersRoutes from "./routes/admin.users.routes";
import adminClassesRoutes from "./routes/admin/admin.classes.routes";
import adminSubjectsRoutes from "./routes/admin/admin.subjects.routes";
import adminStudentsRoutes from "./routes/admin/admin.students.routes";
import adminClassStudentsRoutes from "./routes/admin/admin.class.students.routes";
import adminClassSubjectsRoutes from "./routes/admin/admin.classSubjects.routes";

// ✅ NEW: Teacher ↔ Subject assignments (ADMIN)
import teacherSubjectsRoutes from "./routes/admin/admin.teacherSubjects.routes";

// ✅ NEW: Teacher assignments endpoint
import teacherAssignmentsRoutes from "./routes/teacherAssignments.routes";

// ✅ Phase-7: Report Cards
import { reportCardReadRoutes } from "./routes/reportCardReadRoutes";

// ✅ Phase-7.5: Parent ↔ Student linking
import { parentStudentRoutes } from "./routes/parentStudentRoutes";

// ✅ Phase-8: Report Card PDF
import reportCardPdfRoutes from "./routes/reportCardPdf.routes";

// ✅ Attendance
import attendanceRoutes from "./routes/attendanceRoutes";

// ✅ Teacher-visible classes
import classesRoutes from "./routes/classes";

const app = express();

// ----------------------------------
// CORS
// ----------------------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://sms-frontend-gjfo.onrender.com",
    ],
    credentials: true,
  })
);

// ----------------------------------
// MIDDLEWARE
// ----------------------------------
app.use(express.json());
app.use(cookieParser());

// Prevent malformed cookie crash
app.use((req, res, next) => {
  try {
    const cookie = req.headers["cookie"];
    if (cookie && typeof cookie !== "string") {
      delete req.headers["cookie"];
    }
    next();
  } catch {
    next();
  }
});

// ----------------------------------
// HEALTH CHECK
// ----------------------------------
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Grain of Rice SMS backend is running 🚀" });
});

// ----------------------------------
// DEBUG ROUTES
// ----------------------------------
app.get("/debug/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.get("/debug/subjects", async (_req: Request, res: Response) => {
  const subjects = await prisma.subject.findMany();
  res.json(subjects);
});

// ----------------------------------
// CORE ROUTES
// ----------------------------------
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/gradebook", gradebookRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/assignment-categories", assignmentCategoryRoutes);

// ✅ STANDARDIZED TERMS ROUTE
app.use("/api/terms", termRoutes);

app.use("/api/attendance", attendanceRoutes);

// ✅ NEW: Teacher assignments route
app.use("/api", teacherAssignmentsRoutes);

// ----------------------------------
// REPORT CARDS
// ----------------------------------
app.use("/api/report-cards", reportCardReadRoutes);
app.use("/api", reportCardPdfRoutes);

// ----------------------------------
// PARENT ↔ STUDENT
// ----------------------------------
app.use("/api/parent-students", parentStudentRoutes);

// ----------------------------------
// ADMIN ROUTES
// ----------------------------------
app.use("/api/admin", adminAuditLogRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin", adminStudentsRoutes);
app.use("/api/admin", adminClassesRoutes);
app.use("/api/admin", adminSubjectsRoutes);
app.use("/api/admin", adminClassStudentsRoutes);
app.use("/api/admin", adminClassSubjectsRoutes);

// ✅ NEW: Teacher Subject Assignments (ADMIN)
app.use("/api/admin", teacherSubjectsRoutes);

// ----------------------------------
// FALLBACK
// ----------------------------------
app.get("/", (_req: Request, res: Response) => {
  res.send("Backend API is running ✅");
});

// ----------------------------------
// SERVER
// ----------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});