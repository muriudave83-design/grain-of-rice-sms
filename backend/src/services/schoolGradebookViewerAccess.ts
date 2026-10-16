import { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

export function schoolGradebookViewerIds(raw = process.env.SCHOOL_GRADEBOOK_VIEWER_USER_IDS) {
  return new Set(
    (raw || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

export function canViewSchoolGradebooks(user: { id: number; role: Role }, raw?: string) {
  return user.role === Role.TEACHER && schoolGradebookViewerIds(raw).has(user.id);
}

export function requireSchoolGradebookViewer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!canViewSchoolGradebooks(req.user)) {
    return res.status(403).json({ message: "Forbidden: school-wide gradebook access required" });
  }
  return next();
}
