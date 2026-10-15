import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { getAdminGradebook, getAdminGradebookOptions, listAdminGradebookClasses } from "../../services/adminGradebook.service";

const router = Router();

router.use(authenticate, requireRole([Role.ADMIN]));

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

export default router;
