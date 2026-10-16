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

export function schoolGradebookViewerEmails(raw = process.env.SCHOOL_GRADEBOOK_VIEWER_EMAILS) {
  return new Set(
    (raw || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function canViewSchoolGradebooks(
  user: { id: number; email?: string; role: Role },
  rawIds?: string,
  rawEmails?: string,
) {
  if (user.role !== Role.TEACHER) return false;
  if (schoolGradebookViewerIds(rawIds).has(user.id)) return true;
  return Boolean(user.email && schoolGradebookViewerEmails(rawEmails).has(user.email.trim().toLowerCase()));
}

export function requireSchoolGradebookViewer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!canViewSchoolGradebooks(req.user)) {
    return res.status(403).json({ message: "Forbidden: school-wide gradebook access required" });
  }
  return next();
}
