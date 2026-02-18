console.log("📌 RUNNING INDEX FILE FROM:", __filename);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// =======================
// ROUTE IMPORTS
// =======================
import authRoutes from "./routes/authRoutes";
import protectedRoutes from "./routes/protectedRoutes";

import adminAuditLogRoutes from "./routes/admin.auditLogs.routes";
import adminUsersRoutes from "./routes/admin.users.routes";
import termRoutes from "./routes/termRoutes";
import adminClassSubjects from "./routes/adminClassSubjects";

// 🔴 ADD THIS (CLASSES ROUTES)
import classesRoutes from "./routes/classes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json());

// =======================
// HEALTH CHECK
// =======================
app.get("/api", (_req, res) => {
  res.json({ message: "Grain of Rice SMS backend is running 🚀" });
});

// =======================
// AUTH & PROTECTED ROUTES
// =======================
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);

// =======================
// ADMIN ROUTES
// =======================
app.use("/api/admin", adminAuditLogRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin", termRoutes);
app.use("/api/admin", adminClassSubjects);

// =======================
// CLASSES ROUTES (ADMIN + TEACHER)
// =======================
// Enables:
//   GET  /api/admin/classes
//   POST /api/admin/classes
//   GET  /api/classes/mine
app.use("/api", classesRoutes);

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
