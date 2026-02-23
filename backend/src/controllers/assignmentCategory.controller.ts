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

export const createAssignmentCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const category = await prisma.assignmentCategory.create({
      data: { name },
    });

    res.status(201).json(category);
  } catch (err) {
    console.error("Failed to create assignment category:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
};
