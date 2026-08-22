import { Router } from "express";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";

const prisma = new PrismaClient();
const router = Router();


// ======================================
// GET ALL SUBJECTS ASSIGNED TO A CLASS
// ======================================
router.get(
  "/class-subjects/by-subject/:subjectId",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const subjectId = Number(req.params.subjectId);
      if (!Number.isInteger(subjectId) || subjectId <= 0) {
        return res.status(400).json({ message: "Invalid subject id" });
      }

      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, isArchived: false },
        select: { id: true },
      });
      if (!subject) return res.status(404).json({ message: "Active subject not found" });

      const associations = await prisma.classSubject.findMany({
        where: { subjectId, class: { isArchived: false } },
        select: {
          id: true,
          classId: true,
          subjectId: true,
          class: { select: { id: true, name: true } },
        },
        orderBy: { class: { name: "asc" } },
      });
      return res.json(associations);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to load classes configured for subject" });
    }
  },
);

router.get(
  "/class-subjects/:classId",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      const classId = Number(req.params.classId);

      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({ message: "Invalid class id" });
      }

      const schoolClass = await prisma.class.findFirst({
        where: { id: classId, isArchived: false },
        select: { id: true },
      });
      if (!schoolClass) {
        return res.status(404).json({ message: "Active class not found" });
      }

      const data = await prisma.classSubject.findMany({
        where: { classId, subject: { isArchived: false } },
        include: {
          subject: true,
          class: true,
        },
        orderBy: { subject: { name: "asc" } },
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
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ message: "Invalid class-subject assignment id" });
      }

      const outcome = await prisma.$transaction(async (tx) => {
        const classSubject = await tx.classSubject.findUnique({ where: { id } });
        if (!classSubject) return "already-removed" as const;

        const teacherAssignmentCount = await tx.teacherSubject.count({
          where: {
            classId: classSubject.classId,
            subjectId: classSubject.subjectId,
          },
        });
        if (teacherAssignmentCount > 0) return "in-use" as const;

        await tx.classSubject.delete({ where: { id } });
        return "removed" as const;
      }, { isolationLevel: "Serializable" });

      if (outcome === "already-removed") {
        return res.json({ message: "Class-subject assignment was already removed" });
      }
      if (outcome === "in-use") {
        return res.status(409).json({
          message: "Remove the teacher assignment before removing this subject from the class",
        });
      }

      res.json({ message: "Removed successfully" });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        return res.status(409).json({
          message: "Academic structure changed concurrently; refresh and try again",
        });
      }
      console.error(err);
      res.status(500).json({
        message: "Failed to remove subject from class",
      });
    }
  }
);

export default router;
