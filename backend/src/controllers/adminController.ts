import { Request, Response } from "express";
import { stringify } from "csv-stringify/sync";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma/client";

/**
 * Export students as CSV
 */
export const exportStudentsCSV = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNo: true,
        class: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const records = students.map((s) => [
      s.id,
      s.firstName,
      s.lastName,
      s.admissionNo,
      s.class?.name ?? "",
    ]);

    const header = ["id", "firstName", "lastName", "admissionNo", "className"];
    const csv = stringify([header, ...records]);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="students.csv"');
    res.send(csv);
  } catch (err) {
    console.error("exportStudentsCSV error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create Parent
 */
export const createParent = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      childrenIds,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    if (childrenIds && childrenIds.length > 0) {
      const students = await prisma.student.findMany({
        where: {
          id: { in: childrenIds },
          isArchived: false,
        },
      });

      if (students.length !== childrenIds.length) {
        return res.status(400).json({
          message: "One or more students are invalid or archived",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newParent = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        role: "PARENT",
      },
    });

    if (childrenIds && childrenIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: childrenIds.map((studentId: number) => ({
          parentId: newParent.id,
          studentId,
        })),
        skipDuplicates: true,
      });
    }

    const parentWithChildren = await prisma.user.findUnique({
      where: { id: newParent.id },
      include: {
        parentStudents: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!parentWithChildren) {
      return res.status(404).json({ message: "Parent not found after creation" });
    }

    const { password: _, parentStudents, ...safeParent } = parentWithChildren;

    const formatted = {
      id: safeParent.id,
      name: safeParent.name,
      email: safeParent.email,
      role: safeParent.role,
      children: parentStudents.map((ps) => ({
        id: ps.student.id,
        firstName: ps.student.firstName,
        lastName: ps.student.lastName,
      })),
    };

    return res.status(201).json(formatted);
  } catch (error) {
    console.error("CREATE PARENT ERROR:", error);
    return res.status(500).json({
      message: "Failed to create parent",
    });
  }
};

/**
 * Get Parents
 */
export const getParents = async (req: Request, res: Response) => {
  try {
    const parents = await prisma.user.findMany({
      where: {
        role: "PARENT",
        isArchived: false,
      },
      include: {
        parentStudents: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = parents.map((parent) => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      role: parent.role,
      children: parent.parentStudents.map((ps) => ({
        id: ps.student.id,
        firstName: ps.student.firstName,
        lastName: ps.student.lastName,
      })),
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("GET PARENTS ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch parents",
    });
  }
};

/**
 * Update Parent
 */
export const updateParent = async (req: Request, res: Response) => {
  try {
    const parentId = Number(req.params.id);
    const { firstName, lastName, email, childrenIds } = req.body;

    // 1. FIND USER
    const existingUser = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!existingUser || existingUser.role !== "PARENT") {
      return res.status(404).json({ message: "Parent not found" });
    }

    // 2. VALIDATE STUDENTS
    if (childrenIds && childrenIds.length > 0) {
      const students = await prisma.student.findMany({
        where: {
          id: { in: childrenIds },
          isArchived: false,
        },
      });

      if (students.length !== childrenIds.length) {
        return res.status(400).json({
          message: "One or more students are invalid or archived",
        });
      }
    }

    // 3. UPDATE USER
    await prisma.user.update({
      where: { id: parentId },
      data: {
        email: email ?? existingUser.email,
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : existingUser.name,
      },
    });

    // 4. RESET RELATIONSHIPS
    await prisma.parentStudent.deleteMany({
      where: { parentId },
    });

    if (childrenIds && childrenIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: childrenIds.map((studentId: number) => ({
          parentId,
          studentId,
        })),
        skipDuplicates: true,
      });
    }

    // 5. RETURN UPDATED DATA
    const updatedParent = await prisma.user.findUnique({
      where: { id: parentId },
      include: {
        parentStudents: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!updatedParent) {
      return res.status(404).json({ message: "Parent not found after update" });
    }

    const { password: _, parentStudents, ...safeParent } = updatedParent;

    const formatted = {
      id: safeParent.id,
      name: safeParent.name,
      email: safeParent.email,
      role: safeParent.role,
      children: parentStudents.map((ps) => ({
        id: ps.student.id,
        firstName: ps.student.firstName,
        lastName: ps.student.lastName,
      })),
    };

    return res.json(formatted);
  } catch (err) {
    console.error("UPDATE PARENT ERROR:", err);
    return res.status(500).json({
      message: "Failed to update parent",
    });
  }
};

/**
 * Archive (Deactivate) Parent
 */
export const archiveParent = async (req: Request, res: Response) => {
  try {
    const parentId = Number(req.params.id);

    // 1. FIND USER
    const existingUser = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!existingUser || existingUser.role !== "PARENT") {
      return res.status(404).json({ message: "Parent not found" });
    }

    // 2. ARCHIVE USER
    await prisma.user.update({
      where: { id: parentId },
      data: {
        isArchived: true,
      },
    });

    return res.json({
      message: "Parent archived successfully",
    });
  } catch (err) {
    console.error("ARCHIVE PARENT ERROR:", err);
    return res.status(500).json({
      message: "Failed to archive parent",
    });
  }
};