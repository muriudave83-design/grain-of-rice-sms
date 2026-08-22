import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authenticate } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rolesMiddleware";
import { Prisma } from "@prisma/client";
import { setTeacherSubjectActive } from "../../services/teacherSubjectLifecycle.service";

const router = Router();

/**
 * GET all assignments
 */
router.get(
  "/teacher-subjects",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const assignments = await prisma.teacherSubject.findMany({
        where: includeInactive ? {} : { isActive: true },
        include: {
          teacher: true,
          subject: true,
          class: true
        }
      });

      const result = assignments.map((a) => ({
        id: a.id,
        teacher: {
          id: a.teacher.id,
          name: a.teacher.name
        },
        subject: {
          id: a.subject.id,
          name: a.subject.name
        },
        class: {
          id: a.class.id,
          name: a.class.name
        },
        isActive: a.isActive,
      }));

      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load assignments" });
    }
  }
);

/**
 * CREATE assignment
 */
router.post(
  "/teacher-subjects",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const teacherId = Number(req.body.teacherId);
      const subjectId = Number(req.body.subjectId);
      const classId = Number(req.body.classId);

      if (!teacherId || !subjectId || !classId) {
        return res.status(400).json({
          message: "teacherId, subjectId, and classId are required"
        });
      }

      const [teacher, subject, schoolClass] = await Promise.all([
        prisma.user.findFirst({
          where: { id: teacherId, role: "TEACHER", isActive: true, isArchived: false },
          select: { id: true },
        }),
        prisma.subject.findFirst({
          where: { id: subjectId, isArchived: false },
          select: { id: true },
        }),
        prisma.class.findFirst({
          where: { id: classId, isArchived: false },
          select: { id: true },
        }),
      ]);

      if (!teacher) {
        return res.status(400).json({ message: "Teacher is inactive, archived, or invalid" });
      }
      if (!subject || !schoolClass) {
        return res.status(400).json({ message: "Class or subject is inactive or invalid" });
      }
      const outcome = await prisma.$transaction(async (tx) => {
        const classSubject = await tx.classSubject.findUnique({
          where: { classId_subjectId: { classId, subjectId } },
          select: { id: true },
        });
        if (!classSubject) return { kind: "missing-class-subject" as const };

        const existing = await tx.teacherSubject.findFirst({
          where: { teacherId, subjectId, classId },
          select: { id: true, isActive: true },
        });
        if (existing?.isActive) return { kind: "duplicate" as const };
        if (existing) {
          const assignment = await tx.teacherSubject.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
          return { kind: "reactivated" as const, assignment };
        }

        const assignment = await tx.teacherSubject.create({
          data: { teacherId, subjectId, classId },
        });
        return { kind: "created" as const, assignment };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (outcome.kind === "missing-class-subject") {
        return res.status(409).json({
          message: "Assign the subject to this class before assigning a teacher",
        });
      }
      if (outcome.kind === "duplicate") {
        return res.status(400).json({
          message: "Teacher already assigned to this subject for this class"
        });
      }

      res.json({
        ...outcome.assignment,
        message: outcome.kind === "reactivated"
          ? "Existing teacher assignment reactivated."
          : "Teacher assigned successfully.",
        reactivated: outcome.kind === "reactivated",
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2002" || error.code === "P2034")) {
        return res.status(409).json({
          message: "Academic structure changed concurrently; refresh and try again",
        });
      }
      console.error(error);
      res.status(500).json({ message: "Failed to assign teacher" });
    }
  }
);

router.patch(
  "/teacher-subjects/:id/deactivate",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid assignment id" });
    try {
      const result = await setTeacherSubjectActive(prisma, id, false);
      if (result.status === "NOT_FOUND") return res.status(404).json({ message: "Teacher assignment not found" });
      return res.json({
        assignment: result.assignment,
        message: result.status === "UNCHANGED"
          ? "This teacher assignment is already inactive."
          : "Teacher assignment ended successfully.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to end teacher assignment" });
    }
  },
);

router.patch(
  "/teacher-subjects/:id/reactivate",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid assignment id" });
    try {
      const result = await setTeacherSubjectActive(prisma, id, true);
      if (result.status === "NOT_FOUND") return res.status(404).json({ message: "Teacher assignment not found" });
      if (result.status === "INVALID_STRUCTURE") {
        return res.status(409).json({ message: "Archived or inactive teachers, classes, or subjects cannot be reactivated" });
      }
      return res.json({
        assignment: result.assignment,
        message: result.status === "UNCHANGED"
          ? "This teacher assignment is already active."
          : "Teacher assignment reactivated.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to reactivate teacher assignment" });
    }
  },
);

/**
 * DELETE assignment
 */
router.delete(
  "/teacher-subjects/:id",
  authenticate,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid assignment id"
        });
      }

      const outcome = await prisma.$transaction(async (tx) => {
        // Lock the parent row so new FK-dependent academic history cannot be
        // inserted between the dependency check and physical deletion.
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "TeacherSubject" WHERE id = ${id} FOR UPDATE`
        );

        const assignment = await tx.teacherSubject.findUnique({
          where: { id },
          select: {
            id: true,
            _count: { select: { assignments: true, reportComments: true } },
          },
        });

        if (!assignment) return "already-removed" as const;
        if (assignment._count.assignments > 0 || assignment._count.reportComments > 0) {
          return "has-history" as const;
        }

        await tx.teacherSubject.delete({ where: { id } });
        return "removed" as const;
      });

      if (outcome === "already-removed") {
        return res.json({ message: "Assignment was already removed" });
      }

      if (outcome === "has-history") {
        return res.status(409).json({
          message:
            "Cannot remove this teacher assignment because it contains historical assignments, scores, or report comments",
        });
      }

      res.json({ message: "Assignment removed" });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Unable to remove the teacher assignment safely",
      });
    }
  }
);

export default router;
