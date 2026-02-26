import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { authorizeStudentAccess } from "../middlewares/ownershipMiddleware";

const prisma = new PrismaClient();
const router = Router();

/**
 * CREATE student
 * Access: ADMIN, TEACHER
 */
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req, res) => {
    try {
      const { firstName, lastName, classId, admissionNo, dob } = req.body;

      if (!classId) {
        return res.status(400).json({
          message: "classId is required",
        });
      }

      const student = await prisma.student.create({
        data: {
          firstName,
          lastName,
          classId: Number(classId),
          admissionNo,
          dob: dob ? new Date(dob) : null,
        },
      });

      res.status(201).json(student);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/**
 * GET ALL students
 * Access: ADMIN, TEACHER
 * THIS IS THE MISSING ROUTE
 */
router.get(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req, res) => {
    try {
      const students = await prisma.student.findMany({
        orderBy: {
          id: "asc",
        },
      });

      res.json(students);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/**
 * GET ONE student
 * Access: ADMIN, TEACHER, OWNER (guardian)
 */
router.get(
  "/:id",
  authenticate,
  authorizeStudentAccess,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          guardians: {
            include: {
              user: true,
            },
          },
          sponsorships: {
            include: {
              sponsor: true,
            },
          },
          enrollments: {
            include: {
              subject: true,
            },
          },
          grades: true,
          invoices: true,
          disciplines: true,
        },
      });

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      res.json(student);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export default router;