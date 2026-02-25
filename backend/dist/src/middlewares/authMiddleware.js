"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
async function authenticate(req, res, next) {
    const tokenFromCookie = req.cookies?.access_token;
    const tokenFromHeader = req.headers.authorization?.split(" ")[1];
    const token = tokenFromCookie || tokenFromHeader;
    if (!token) {
        return res.status(401).json({
            message: "Access denied. No token provided.",
        });
    }
    try {
        const secret = process.env.JWT_SECRET || "dev_secret";
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await client_2.prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                studentProfile: {
                    select: { id: true },
                },
                parentStudents: {
                    select: { studentId: true },
                },
            },
        });
        if (!user) {
            return res.status(401).json({
                message: "User not found",
            });
        }
        const authUser = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        // 🎓 STUDENT CONTEXT
        if (user.role === client_1.Role.STUDENT) {
            if (!user.studentProfile) {
                return res.status(403).json({
                    message: "Student account not linked",
                });
            }
            authUser.studentId = user.studentProfile.id;
        }
        // 👨‍👩‍👧 PARENT CONTEXT
        if (user.role === client_1.Role.PARENT) {
            authUser.studentIds = user.parentStudents.map((ps) => ps.studentId);
        }
        req.user = authUser;
        next();
    }
    catch (error) {
        return res.status(403).json({
            message: "Invalid or expired token",
        });
    }
}
