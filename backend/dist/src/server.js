"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// 🔎 DEBUG: show which database Prisma is using
console.log("DATABASE_URL =", process.env.DATABASE_URL);
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const client_1 = require("./prisma/client");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const protectedRoutes_1 = __importDefault(require("./routes/protectedRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const assessmentRoutes_1 = require("./routes/assessmentRoutes");
const gradebookRoutes_1 = __importDefault(require("./routes/gradebookRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
// ✅ Assignment Categories
const assignmentCategory_routes_1 = __importDefault(require("./routes/assignmentCategory.routes"));
// ✅ Terms route (STANDARDIZED)
const termRoutes_1 = __importDefault(require("./routes/termRoutes"));
// ✅ Admin routes
const admin_auditLogs_routes_1 = __importDefault(require("./routes/admin.auditLogs.routes"));
const admin_users_routes_1 = __importDefault(require("./routes/admin.users.routes"));
const admin_classes_routes_1 = __importDefault(require("./routes/admin/admin.classes.routes"));
const admin_subjects_routes_1 = __importDefault(require("./routes/admin/admin.subjects.routes"));
const admin_students_routes_1 = __importDefault(require("./routes/admin/admin.students.routes"));
const admin_class_students_routes_1 = __importDefault(require("./routes/admin/admin.class.students.routes"));
const admin_classSubjects_routes_1 = __importDefault(require("./routes/admin/admin.classSubjects.routes"));
const adminAttendance_routes_1 = __importDefault(require("./routes/adminAttendance.routes"));
// ✅ NEW: Teacher ↔ Subject assignments (ADMIN)
const admin_teacherSubjects_routes_1 = __importDefault(require("./routes/admin/admin.teacherSubjects.routes"));
// ✅ NEW: Teacher assignments endpoint
const teacherAssignments_routes_1 = __importDefault(require("./routes/teacherAssignments.routes"));
// ✅ Phase-7: Report Cards
const reportCardReadRoutes_1 = require("./routes/reportCardReadRoutes");
const reportCardRoutes_1 = require("./routes/reportCardRoutes");
// ✅ Phase-7.5: Parent ↔ Student linking
const parentStudentRoutes_1 = require("./routes/parentStudentRoutes");
// ✅ Phase-8: Report Card PDF
const reportCardPdf_routes_1 = __importDefault(require("./routes/reportCardPdf.routes"));
// ✅ Attendance
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
// ✅ Teacher-visible classes
const classes_1 = __importDefault(require("./routes/classes"));
const app = (0, express_1.default)();
// ----------------------------------
// CORS
// ----------------------------------
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "https://sms-frontend-gjfo.onrender.com",
    ],
    credentials: true,
}));
// ----------------------------------
// MIDDLEWARE
// ----------------------------------
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Prevent malformed cookie crash
app.use((req, res, next) => {
    try {
        const cookie = req.headers["cookie"];
        if (cookie && typeof cookie !== "string") {
            delete req.headers["cookie"];
        }
        next();
    }
    catch {
        next();
    }
});
// ----------------------------------
// HEALTH CHECK
// ----------------------------------
app.get("/api", (req, res) => {
    res.json({ message: "Grain of Rice SMS backend is running 🚀" });
});
// ----------------------------------
// DEBUG ROUTES
// ----------------------------------
app.get("/debug/users", async (_req, res) => {
    const users = await client_1.prisma.user.findMany();
    res.json(users);
});
app.get("/debug/subjects", async (_req, res) => {
    const subjects = await client_1.prisma.subject.findMany();
    res.json(subjects);
});
// ----------------------------------
// CORE ROUTES
// ----------------------------------
app.use("/api/auth", authRoutes_1.default);
app.use("/api", protectedRoutes_1.default);
app.use("/api/students", studentRoutes_1.default);
app.use("/api/assessments", assessmentRoutes_1.assessmentRoutes);
app.use("/api/classes", classes_1.default);
app.use("/api/gradebook", gradebookRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/assignment-categories", assignmentCategory_routes_1.default);
app.use("/api/admin/attendance", adminAttendance_routes_1.default);
// ✅ STANDARDIZED TERMS ROUTE
app.use("/api/terms", termRoutes_1.default);
app.use("/api/attendance", attendanceRoutes_1.default);
// ✅ NEW: Teacher assignments route
app.use("/api", teacherAssignments_routes_1.default);
// ----------------------------------
// REPORT CARDS
// ----------------------------------
app.use("/api/report-cards", reportCardReadRoutes_1.reportCardReadRoutes);
app.use("/api/report-cards", reportCardRoutes_1.reportCardReadRoutes);
app.use("/api", reportCardPdf_routes_1.default);
// ----------------------------------
// PARENT ↔ STUDENT
// ----------------------------------
app.use("/api/parent-students", parentStudentRoutes_1.parentStudentRoutes);
// ----------------------------------
// ADMIN ROUTES
// ----------------------------------
app.use("/api/admin", admin_auditLogs_routes_1.default);
app.use("/api/admin", admin_users_routes_1.default);
app.use("/api/admin", admin_students_routes_1.default);
app.use("/api/admin", admin_classes_routes_1.default);
app.use("/api/admin", admin_subjects_routes_1.default);
app.use("/api/admin", admin_class_students_routes_1.default);
app.use("/api/admin", admin_classSubjects_routes_1.default);
// ✅ NEW: Teacher Subject Assignments (ADMIN)
app.use("/api/admin", admin_teacherSubjects_routes_1.default);
// ----------------------------------
// FALLBACK
// ----------------------------------
app.get("/", (_req, res) => {
    res.send("Backend API is running ✅");
});
// ----------------------------------
// SERVER
// ----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
