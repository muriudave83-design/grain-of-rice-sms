import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const prisma = new PrismaClient();
const router = Router();


// ======================================
// GET ALL SUBJECTS ASSIGNED TO A CLASS
// ======================================
router.get(
  "/class-subjects/:classId",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const classId = Number(req.params.classId);

      const data = await prisma.classSubject.findMany({
        where: { classId },
        include: {
          subject: true,
          class: true,
        },
      });

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load class subjects" });
    }
  }
);


// ======================================
// ASSIGN SUBJECT TO CLASS
// ======================================
router.post(
  "/class-subjects",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const { classId, subjectId } = req.body;

      if (!classId || !subjectId) {
        return res.status(400).json({
          message: "classId and subjectId required",
        });
      }

      // prevent duplicates
      const exists = await prisma.classSubject.findFirst({
        where: {
          classId: Number(classId),
          subjectId: Number(subjectId),
        },
      });

      if (exists) {
        return res.status(400).json({
          message: "Subject already assigned to this class",
        });
      }

      const created = await prisma.classSubject.create({
        data: {
          classId: Number(classId),
          subjectId: Number(subjectId),
        },
        include: {
          subject: true,
          class: true,
        },
      });

      res.json(created);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Failed to assign subject to class",
      });
    }
  }
);


// ======================================
// REMOVE SUBJECT FROM CLASS
// ======================================
router.delete(
  "/class-subjects/:id",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      await prisma.classSubject.delete({
        where: { id: Number(req.params.id) },
      });

      res.json({ message: "Removed successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Failed to remove subject from class",
      });
    }
  }
);

export default router;
