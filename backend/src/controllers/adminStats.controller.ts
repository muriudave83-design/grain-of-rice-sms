import { Request, Response } from "express";
import { prisma } from "../prisma/client";

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.count();

    const teachers = await prisma.user.count({
      where: { role: "TEACHER" }
    });

    const parents = await prisma.user.count({
      where: { role: "PARENT" }
    });

    const classes = await prisma.class.count();

    res.json({
      students,
      teachers,
      parents,
      classes
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Failed to load stats" });
  }
};
