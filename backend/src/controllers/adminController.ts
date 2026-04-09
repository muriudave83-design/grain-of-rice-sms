import { Request, Response } from "express";
import { stringify } from "csv-stringify/sync";
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

    const records = students.map((s: any) => [
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
 * ✅ Create Parent (NOW USES Parent TABLE)
 */
export const createParent = async (req: Request, res: Response) => {
  console.log("🔥 CREATE PARENT BODY:", req.body);

  try {
    const { name, email, phone, address, city, relationship, notes } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name required" });
    }

    const newParent = await prisma.parent.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        relationship,
        notes,
      },
    });

    return res.status(201).json(newParent);
  } catch (error: any) {
    console.error("💥 CREATE PARENT ERROR:", error);

    return res.status(500).json({
      message: "Failed to create parent",
      error: error.message,
    });
  }
};

/**
 * ✅ GET ALL PARENTS (FIXED — USES JUNCTION + DEEP INCLUDE)
 */
export const getParents = async (req: Request, res: Response) => {
  try {
    const parents = await prisma.parent.findMany({
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = parents.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone || "",
      address: p.address || "",
      city: p.city || "",
      relationship: p.relationship || "",
      notes: p.notes || "",
      childrenCount: p.students.length,
      children: p.students.map((ps: any) => ({
        id: ps.student.id,
        firstName: ps.student.firstName,
        lastName: ps.student.lastName,
      })),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("GET PARENTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ GET SINGLE PARENT
 */
export const getParentById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const parent = await prisma.parent.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    res.json(parent);
  } catch (error) {
    console.error("GET PARENT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ UPDATE PARENT
 */
export const updateParent = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const { name, email, phone, address, city, relationship, notes } = req.body;

    const updated = await prisma.parent.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        city,
        relationship,
        notes,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("UPDATE PARENT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ ARCHIVE PARENT (SOFT DELETE STYLE)
 */
export const archiveParent = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    await prisma.parent.delete({
      where: { id },
    });

    res.json({ message: "Parent deleted" });
  } catch (error) {
    console.error("ARCHIVE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ LINK STUDENT TO PARENT
 */
export const linkStudentToParent = async (req: Request, res: Response) => {
  try {
    const { studentId, parentId } = req.body;

    if (!studentId || !parentId) {
      return res.status(400).json({ message: "studentId and parentId required" });
    }

    const existing = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Already linked" });
    }

    const link = await prisma.parentStudent.create({
      data: {
        parentId,
        studentId,
      },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error("LINK ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 🔥 NEW — UNLINK STUDENT FROM PARENT
 */
export const unlinkStudentFromParent = async (req: Request, res: Response) => {
  try {
    const { parentId, studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({ message: "Missing parentId or studentId" });
    }

    await prisma.parentStudent.deleteMany({
      where: {
        parentId: String(parentId), // ✅ KEEP STRING
        studentId: Number(studentId), // ✅ STUDENT IS NUMBER
      },
    });

    return res.json({ message: "Student unlinked successfully" });
  } catch (error) {
    console.error("UNLINK ERROR:", error);
    return res.status(500).json({ message: "Failed to unlink student" });
  }
};

/**
 * ✅ Reset User Password (UNCHANGED)
 */
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: "123456",
        mustChangePassword: true,
      },
    });

    return res.json({ message: "Password reset" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Failed to reset password",
    });
  }
};