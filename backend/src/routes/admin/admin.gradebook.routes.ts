import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { activateContributionScope, getAdminGradebook, getAdminGradebookOptions, listAdminGradebookClasses, reviewAssignmentContribution } from "../../services/adminGradebook.service";
import { createTeacherSubjectHandover, listTeacherSubjectHandovers, revokeTeacherSubjectHandover, TeacherSubjectHandoverError } from "../../services/teacherSubjectHandover.service";

const router = Router();

router.use(authenticate, requireRole([Role.ADMIN]));

router.get("/teacher-subject-handovers", async (req, res) => {
  const active = req.query.active === undefined ? undefined : req.query.active === "true";
  try {
    return res.json(await listTeacherSubjectHandovers(prisma, active));
  } catch (error) {
    console.error("LIST TEACHER HANDOVERS ERROR:", error);
    return res.status(500).json({ message: "Failed to list teacher handovers" });
  }
});

router.post("/teacher-subject-handovers", async (req, res) => {
  const originalTeacherSubjectId = Number(req.body.originalTeacherSubjectId);
  const replacementTeacherSubjectId = Number(req.body.replacementTeacherSubjectId);
  const termId = Number(req.body.termId);
  if (![originalTeacherSubjectId, replacementTeacherSubjectId, termId].every((id) => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ message: "Valid originalTeacherSubjectId, replacementTeacherSubjectId and termId are required" });
  }
  try {
    return res.status(201).json(await createTeacherSubjectHandover(prisma, {
      originalTeacherSubjectId, replacementTeacherSubjectId, termId,
      createdByAdminId: req.user!.id, note: req.body.note,
    }));
  } catch (error) {
    if (error instanceof TeacherSubjectHandoverError) return res.status(error.status).json({ message: error.message });
    console.error("CREATE TEACHER HANDOVER ERROR:", error);
    return res.status(500).json({ message: "Failed to create teacher handover" });
  }
});

router.post("/teacher-subject-handovers/:id/revoke", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Valid handover id is required" });
  try {
    return res.json(await revokeTeacherSubjectHandover(prisma, id, req.user!.id));
  } catch (error) {
    if (error instanceof TeacherSubjectHandoverError) return res.status(error.status).json({ message: error.message });
    console.error("REVOKE TEACHER HANDOVER ERROR:", error);
    return res.status(500).json({ message: "Failed to revoke teacher handover" });
  }
});

router.get("/gradebook/classes", async (_req, res) => {
  try {
    return res.json(await listAdminGradebookClasses(prisma));
  } catch (error) {
    console.error("ADMIN GRADEBOOK CLASSES ERROR:", error);
    return res.status(500).json({ message: "Failed to load gradebook classes" });
  }
});

router.get("/gradebook/classes/:classId/options", async (req, res) => {
  const classId = Number(req.params.classId);
  if (!Number.isInteger(classId) || classId <= 0) return res.status(400).json({ message: "Invalid class id" });
  try {
    const options = await getAdminGradebookOptions(prisma, classId);
    if (!options) return res.status(404).json({ message: "Active class not found" });
    return res.json(options);
  } catch (error) {
    console.error("ADMIN GRADEBOOK OPTIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to load gradebook options" });
  }
});

router.get("/gradebook/teacher-subjects/:teacherSubjectId", async (req, res) => {
  const teacherSubjectId = Number(req.params.teacherSubjectId);
  const termId = Number(req.query.termId);
  if (!Number.isInteger(teacherSubjectId) || teacherSubjectId <= 0) return res.status(400).json({ message: "Invalid teacher assignment id" });
  if (!Number.isInteger(termId) || termId <= 0) return res.status(400).json({ message: "Valid termId is required" });
  try {
    const gradebook = await getAdminGradebook(prisma, teacherSubjectId, termId);
    if (!gradebook) return res.status(404).json({ message: "Gradebook selection not found" });
    return res.json(gradebook);
  } catch (error) {
    console.error("ADMIN GRADEBOOK ERROR:", error);
    return res.status(500).json({ message: "Failed to load gradebook" });
  }
});

router.patch("/gradebook/assignments/:assignmentId/contribution", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return res.status(400).json({ message: "Invalid assignment id" });
  try {
    return res.json(await reviewAssignmentContribution(prisma, {
      assignmentId, status: req.body.status, note: req.body.note,
      expectedReviewedAt: req.body.expectedReviewedAt ?? null, actorUserId: req.user!.id,
    }));
  } catch (error: any) {
    return res.status(error.status ?? 500).json({ message: error.message, details: error.details });
  }
});

router.post("/gradebook/contribution-scopes/activate", async (req, res) => {
  const classId = Number(req.body.classId);
  const subjectId = Number(req.body.subjectId);
  const termId = Number(req.body.termId);
  if (![classId, subjectId, termId].every((id) => Number.isInteger(id) && id > 0)) return res.status(400).json({ message: "Valid classId, subjectId and termId are required" });
  try {
    return res.json(await activateContributionScope(prisma, { classId, subjectId, termId, actorUserId: req.user!.id }));
  } catch (error: any) {
    return res.status(error.status ?? 500).json({ message: error.message, details: error.details });
  }
});

export default router;
