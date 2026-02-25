"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log("📌 RUNNING INDEX FILE FROM:", __filename);
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// =======================
// ROUTE IMPORTS
// =======================
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const protectedRoutes_1 = __importDefault(require("./routes/protectedRoutes"));
const admin_auditLogs_routes_1 = __importDefault(require("./routes/admin.auditLogs.routes"));
const admin_users_routes_1 = __importDefault(require("./routes/admin.users.routes"));
const termRoutes_1 = __importDefault(require("./routes/termRoutes"));
const adminClassSubjects_1 = __importDefault(require("./routes/adminClassSubjects"));
// 🔴 ADD THIS (CLASSES ROUTES)
const classes_1 = __importDefault(require("./routes/classes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// =======================
// MIDDLEWARE
// =======================
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// =======================
// HEALTH CHECK
// =======================
app.get("/api", (_req, res) => {
    res.json({ message: "Grain of Rice SMS backend is running 🚀" });
});
// =======================
// AUTH & PROTECTED ROUTES
// =======================
app.use("/api/auth", authRoutes_1.default);
app.use("/api", protectedRoutes_1.default);
// =======================
// ADMIN ROUTES
// =======================
app.use("/api/admin", admin_auditLogs_routes_1.default);
app.use("/api/admin", admin_users_routes_1.default);
app.use("/api/admin", termRoutes_1.default);
app.use("/api/admin", adminClassSubjects_1.default);
// =======================
// CLASSES ROUTES (ADMIN + TEACHER)
// =======================
// Enables:
//   GET  /api/admin/classes
//   POST /api/admin/classes
//   GET  /api/classes/mine
app.use("/api", classes_1.default);
// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
