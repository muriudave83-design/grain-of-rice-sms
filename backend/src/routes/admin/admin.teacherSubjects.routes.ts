import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const router = Router();

/**
 * GET /api/admin/teacher-subjects
 * Returns all teacher → subject → class assignments
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

      const assignments = subjects.flatMap((subject) =>
        subject.classSubjects.map((cs) => ({
          teacher: {
            id: subject.teacher?.id,
            name: subject.teacher?.name
          },
          subject: {
            id: subject.id,
            name: subject.name
          },
          class: {
            id: cs.class.id,
            name: cs.class.name
          }
        }))
      );

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching teacher-subject assignments:", error);
      res.status(500).json({
        message: "Failed to fetch teacher assignments"
      });
    }
  }
);

export default router;