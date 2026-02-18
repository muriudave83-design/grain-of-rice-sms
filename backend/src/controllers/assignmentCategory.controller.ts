import { Request, Response } from "express";
import { prisma } from "../prisma/client";

export const listAssignmentCategories = async (
  _req: Request,
  res: Response
) => {
  try {
    const categories = await prisma.assignmentCategory.findMany({
      orderBy: { id: "asc" },
    });

    res.json(categories);
  } catch (err) {
    console.error("Failed to fetch assignment categories:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};
