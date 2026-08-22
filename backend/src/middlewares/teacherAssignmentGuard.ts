import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { Role } from "@prisma/client";

export const requireTeacherAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;

    // Only enforce for teachers
    if (!user || user.role !== Role.TEACHER) {
      return next();
    }

    const classId = Number(req.body.classId || req.query.classId);
    const subjectId = Number(req.body.subjectId || req.query.subjectId);

    if (!classId || !subjectId) {
      return res.status(400).json({
        message: "classId and subjectId are required"
      });
    }

    const assignment = await prisma.teacherSubject.findFirst({
      where: {
        teacherId: user.id,
        classId,
        subjectId,
        isActive: true,
      }
    });

    if (!assignment) {
      return res.status(403).json({
        message: "You are not assigned to this class and subject"
      });
    }

    next();
  } catch (error) {
    console.error("Teacher assignment guard error:", error);
    res.status(500).json({ message: "Authorization check failed" });
  }
};
