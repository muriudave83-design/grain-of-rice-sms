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
const client_1 = require("../prisma/client");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const protectedRoutes_1 = __importDefault(require("./routes/protectedRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const assessmentRoutes_1 = require("./routes/assessmentRoutes");
const gradebookRoutes_1 = __importDefault(require("./routes/gradebookRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const assignmentCategory_routes_1 = __importDefault(require("./routes/assignmentCategory.routes"));
const termRoutes_1 = __importDefault(require("./routes/termRoutes"));
const admin_auditLogs_routes_1 = __importDefault(require("./routes/admin.auditLogs.routes"));
const admin_users_routes_1 = __importDefault(require("./routes/admin.users.routes"));
const admin_classes_routes_1 = __importDefault(require("./routes/admin/admin.classes.routes"));
const admin_subjects_routes_1 = __importDefault(require("./routes/admin/admin.subjects.routes"));
const admin_students_routes_1 = __importDefault(require("./routes/admin/admin.students.routes"));
const admin_class_students_routes_1 = __importDefault(require("./routes/admin/admin.class.students.routes"));
const admin_classSubjects_routes_1 = __importDefault(require("./routes/admin/admin.classSubjects.routes"));
const adminAttendance_routes_1 = __importDefault(require("./routes/adminAttendance.routes"));
const admin_teacherSubjects_routes_1 = __importDefault(require("./routes/admin/admin.teacherSubjects.routes"));
const teacherAssignments_routes_1 = __importDefault(require("./routes/teacherAssignments.routes"));
const reportCardReadRoutes_1 = require("./routes/reportCardReadRoutes");
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const parentStudentRoutes_1 = require("./routes/parentStudentRoutes");
const admin_parents_routes_1 = __importDefault(require("./routes/admin.parents.routes"));
const reportCardPdf_routes_1 = __importDefault(require("./routes/reportCardPdf.routes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const classes_1 = __importDefault(require("./routes/classes"));
const teacher_routes_1 = __importDefault(require("./routes/teacher.routes"));
const fees_routes_1 = __importDefault(require("./routes/fees.routes"));
const sponsorship_routes_1 = __importDefault(require("./routes/sponsorship.routes"));
const discipline_routes_1 = __importDefault(require("./routes/discipline.routes"));
const app = (0, express_1.default)();
// ----------------------------------
// ✅ CORS (FIXED FOR RENDER)
// ----------------------------------
const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://sms-frontend-gjfo.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
// ✅ CRITICAL: handle preflight requests
app.options("*", (0, cors_1.default)(corsOptions));
// ----------------------------------
// MIDDLEWARE
// ----------------------------------
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
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
app.get("/api", (_req, res) => {
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
app.use("/api/students", studentRoutes_1.default);
app.use("/api", protectedRoutes_1.default);
app.use("/api/assessments", assessmentRoutes_1.assessmentRoutes);
app.use("/api/classes", classes_1.default);
app.use("/api/teacher", teacher_routes_1.default);
app.use("/api/gradebook", gradebookRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/assignment-categories", assignmentCategory_routes_1.default);
app.use("/api/admin/attendance", adminAttendance_routes_1.default);
app.use("/api/terms", termRoutes_1.default);
app.use("/api/attendance", attendanceRoutes_1.default);
app.use("/api/fees", fees_routes_1.default);
app.use("/api/sponsorship", sponsorship_routes_1.default);
app.use("/api/teacher-assignments", teacherAssignments_routes_1.default);
app.use("/api/discipline", discipline_routes_1.default);
// ----------------------------------
// REPORT CARDS
// ----------------------------------
app.use("/api/report-cards", reportCardReadRoutes_1.reportCardReadRoutes);
app.use("/api/report-cards/pdf", reportCardPdf_routes_1.default);
app.use("/api/reports", reports_routes_1.default);
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
app.use("/api/admin", admin_parents_routes_1.default);
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
const PORT = Number(process.env.PORT) || 5055;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
