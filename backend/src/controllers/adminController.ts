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
      phone, // optional (not stored in schema currently)
      childrenIds,
    } = req.body;

    // 1. VALIDATION
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // 2. CHECK EXISTING USER
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // 3. HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. CREATE USER (PARENT ROLE)
    const newParent = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        role: "PARENT",
      },
    });

    // 5. LINK TO STUDENTS
    if (childrenIds && childrenIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: childrenIds.map((studentId: number) => ({
          parentId: newParent.id,
          studentId,
        })),
        skipDuplicates: true,
      });
    }

    // 6. FETCH WITH CHILDREN
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

    // 7. CLEAN RESPONSE FORMAT
    const formatted = {
      ...parentWithChildren,
      children: parentWithChildren?.parentStudents.map((ps) => ps.student),
    };

    return res.status(201).json(formatted);
  } catch (error) {
    console.error("CREATE PARENT ERROR:", error);
    return res.status(500).json({
      message: "Failed to create parent",
    });
  }
};