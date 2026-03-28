import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.get(
  "/teacher/assignments",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req: any, res) => {
    try {
      const teacherId = req.user.id;

      const assignments = await prisma.teacherSubject.findMany({
        where: {
          teacherId: teacherId,
        },
        include: {
          subject: true,
          class: true,
        },
      });

      res.json(assignments);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Failed to fetch teacher assignments",
      });
    }
  }
);

export default router;
