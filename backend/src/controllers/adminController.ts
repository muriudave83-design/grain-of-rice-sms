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
            name: true
          }
        }
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
