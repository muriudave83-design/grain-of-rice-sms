import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const router = Router();

/**
 * GET /api/admin/teacher-subjects
 */
router.get(
  "/teacher-subjects",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const subjects = await prisma.subject.findMany({
        where: {
          teacherId: { not: null }
        },
        include: {
          teacher: true,
          classSubjects: {
            include: {
              class: true
            }
          }
        }
      });

      const assignments = subjects.flatMap((subject: any) =>
        subject.classSubjects.map((cs: any) => ({
          teacherId: subject.teacher?.id,
          teacherName: subject.teacher?.name,
          subjectId: subject.id,
          subjectName: subject.name,
          classId: cs.class.id,
          className: cs.class.name
        }))
      );

      res.json(assignments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch teacher assignments" });
    }
  }
);

export default router;