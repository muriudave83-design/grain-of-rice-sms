import { Router } from "express";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { prisma } from "../../prisma/client";
import { loadClassReports } from "../../services/classReport.service";

const router = Router();

router.use(authenticate, requireRole(["ADMIN"]));

router.get("/reports/classes/:classId/terms/:termId", async (req, res) => {
  const classId = Number(req.params.classId);
  const termId = Number(req.params.termId);
  if (!Number.isInteger(classId) || classId <= 0 || !Number.isInteger(termId) || termId <= 0) {
    return res.status(400).json({ message: "Valid classId and termId are required" });
  }

  try {
    const [schoolClass, term] = await Promise.all([
      prisma.class.findFirst({
        where: { id: classId, isArchived: false },
        select: { id: true, name: true },
      }),
      prisma.term.findFirst({
        where: { id: termId, classId },
        select: { id: true, name: true, academicYear: true, startDate: true, endDate: true },
      }),
    ]);
    if (!schoolClass) return res.status(404).json({ message: "Class not found" });
    if (!term) return res.status(404).json({ message: "Term not found for this class" });

    const reports = await loadClassReports(prisma, {
      classId,
      termId,
      termStartDate: term.startDate,
      termEndDate: term.endDate,
    });
    return res.json({ class: schoolClass, term, reports });
  } catch (error) {
    console.error("ADMIN CLASS REPORT ERROR:", error);
    return res.status(500).json({ message: "Failed to load class report cards" });
  }
});

export default router;
