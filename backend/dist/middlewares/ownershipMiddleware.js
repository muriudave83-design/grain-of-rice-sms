"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeStudentAccess = void 0;
const client_1 = require("../prisma/client");
/**
 * Ensures that a user can only access a student
 * based on their role and relationship.
 *
 * Admin      -> Full access
 * Teacher    -> Students they teach (via Enrollment → Subject → Teacher)
 * Parent     -> Their own children (Guardian table)
 * Student    -> Self only
 * Sponsor    -> Sponsored students
 * Accountant -> Billing-only access
 */
const authorizeStudentAccess = async (req, res, next) => {
    const user = req.user;
    // studentId can appear under different param names
    const rawStudentId = req.params.studentId ??
        req.params.id ??
        req.query.studentId;
    const studentId = Number(rawStudentId);
    if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    if (!studentId || Number.isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
    }
    // ----------------------------------
    // ADMIN — full access
    // ----------------------------------
    if (user.role === "ADMIN") {
        return next();
    }
    // ----------------------------------
    // ACCOUNTANT — allowed (billing module only)
    // NOTE: Route-level guards must still be correct
    // ----------------------------------
    if (user.role === "ACCOUNTANT") {
        return next();
    }
    // ----------------------------------
    // STUDENT — self only
    // ----------------------------------
    if (user.role === "STUDENT") {
        if (user.id === studentId) {
            return next();
        }
        return res.status(403).json({
            message: "Forbidden: Students can only access their own data",
        });
    }
    // ----------------------------------
    // TEACHER — must teach the student
    // ----------------------------------
    if (user.role === "TEACHER") {
        const teaches = await client_1.prisma.enrollment.findFirst({
            where: {
                studentId,
                subject: {
                    teacherId: user.id,
                },
            },
            select: { id: true },
        });
        if (teaches) {
            return next();
        }
        return res.status(403).json({
            message: "Forbidden: You do not teach this student",
        });
    }
    // ----------------------------------
    // PARENT — must be guardian
    // ----------------------------------
    if (user.role === "PARENT") {
        const guardian = await client_1.prisma.guardian.findFirst({
            where: {
                studentId,
                userId: user.id,
            },
            select: { id: true },
        });
        if (guardian) {
            return next();
        }
        return res.status(403).json({
            message: "Forbidden: This is not your child",
        });
    }
    // ----------------------------------
    // SPONSOR — must sponsor student
    // ----------------------------------
    if (user.role === "SPONSOR") {
        const sponsorship = await client_1.prisma.sponsorship.findFirst({
            where: {
                studentId,
                sponsorId: user.id,
            },
            select: { id: true },
        });
        if (sponsorship) {
            return next();
        }
        return res.status(403).json({
            message: "Forbidden: You do not sponsor this student",
        });
    }
    // ----------------------------------
    // Fallback
    // ----------------------------------
    return res.status(403).json({
        message: "Forbidden: No access to this student",
    });
};
exports.authorizeStudentAccess = authorizeStudentAccess;
