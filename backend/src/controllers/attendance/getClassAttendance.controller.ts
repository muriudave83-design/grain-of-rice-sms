import { Request, Response } from "express";
import { prisma } from "../../prisma/client";

export async function getClassAttendance(req: Request, res: Response) {
  try {
    const classId = Number(req.params.classId);

    // ✅ Get students WITH user
    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        user: true,
      },
    });

    // ✅ Format response
    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user?.name || "Unknown",
      status: null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching class attendance:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}