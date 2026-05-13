import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { Role } from "@prisma/client";

/**
 * ============================================================
 * OWNERSHIP MIDDLEWARE (ROW-LEVEL SECURITY ONLY)
 * ============================================================
 * IMPORTANT:
 * ❌ NOT RBAC (do not use for endpoint access control)
 * ✅ Only verifies relationship to a specific student
 */
export const authorizeStudentAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  const rawStudentId =
    req.params.studentId ??
    req.params.id ??
    req.query.studentId;

  const studentId = Number(rawStudentId);

  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!studentId || Number.isNaN(studentId)) {
    return res.status(400).json({ message: "Invalid student ID" });
  }

  // ============================================================
  // ADMIN — always allowed (override all ownership rules)
  // ============================================================
  if (user.role === Role.ADMIN) {
    return next();
  }

  // ============================================================
  // ACCOUNTANT — allowed globally (billing context assumed)
  // ============================================================
  if (user.role === Role.ACCOUNTANT) {
    return next();
  }

  // ============================================================
  // STUDENT — only self access
  // ============================================================
  if (user.role === Role.STUDENT) {
    if (user.id === studentId) return next();

    return res.status(403).json({
      message: "Forbidden: Students can only access their own data",
    });
  }

  // ============================================================
  // TEACHER — must have enrollment relationship
  // ============================================================
  if (user.role === Role.TEACHER) {
    const teaches = await prisma.enrollment.findFirst({
      where: {
        studentId,
        subject: {
          teacherId: user.id,
        },
      },
      select: { id: true },
    });

    if (teaches) return next();

    return res.status(403).json({
      message: "Forbidden: You do not teach this student",
    });
  }

  // ============================================================
  // PARENT — must be linked guardian
  // ============================================================
  if (user.role === Role.PARENT) {
    const guardian = await prisma.guardian.findFirst({
      where: {
        studentId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (guardian) return next();

    return res.status(403).json({
      message: "Forbidden: This is not your child",
    });
  }

  // ============================================================
  // SPONSOR — must have sponsorship link
  // ============================================================
  if (user.role === Role.SPONSOR) {
    const sponsorship = await prisma.sponsorship.findFirst({
      where: {
        studentId,
        sponsorId: user.id,
      },
      select: { id: true },
    });

    if (sponsorship) return next();

    return res.status(403).json({
      message: "Forbidden: You do not sponsor this student",
    });
  }

  // ============================================================
  // DEFAULT DENY
  // ============================================================
  return res.status(403).json({
    message: "Forbidden: No access to this student",
  });
};