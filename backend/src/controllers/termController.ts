import { Request, Response } from "express";
import { prisma } from "../prisma/client";

// GET /api/admin/terms
export async function getTerms(
  req: Request,
  res: Response
) {
  try {
    const terms = await prisma.term.findMany({
      orderBy: { startDate: "desc" },
    });

    return res.json(terms);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch terms",
      error: error.message,
    });
  }
}

// POST /api/admin/terms
export async function createTerm(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      startDate,
      endDate,
      academicYear,
      classId,
    } = req.body;

    if (
      !name ||
      !startDate ||
      !endDate ||
      !academicYear
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const term = await prisma.term.create({
      data: {
        name,
        academicYear,

        startDate: new Date(startDate),
        endDate: new Date(endDate),

        ...(classId && {
          classId: Number(classId),
        }),
      },
    });

    return res.status(201).json(term);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create term",
      error: error.message,
    });
  }
}

// TOGGLE LOCK
export const toggleTermLock = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    const term = await prisma.term.findUnique({
      where: { id },
    });

    if (!term) {
      return res.status(404).json({
        message: "Term not found",
      });
    }

    const updated = await prisma.term.update({
      where: { id },
      data: {
        isLocked: !term.isLocked,
      },
    });

    return res.json(updated);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message:
        "Failed to toggle term lock",
      error: error.message,
    });
  }
};

// UPDATE TERM
export async function updateTerm(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    const {
      name,
      academicYear,
      startDate,
      endDate,
      classId,
      isLocked,
    } = req.body;

    const updated = await prisma.term.update({
      where: { id },

      data: {
        ...(name !== undefined && {
          name,
        }),

        ...(academicYear !== undefined && {
          academicYear,
        }),

        ...(startDate !== undefined && {
          startDate: startDate
            ? new Date(startDate)
            : undefined,
        }),

        ...(endDate !== undefined && {
          endDate: endDate
            ? new Date(endDate)
            : undefined,
        }),

        ...(classId && {
          classId: Number(classId),
        }),

        ...(isLocked !== undefined && {
          isLocked,
        }),
      },
    });

    return res.json(updated);

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update term",
      error: error.message,
    });
  }
}

// DELETE TERM
export async function deleteTerm(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    await prisma.term.delete({
      where: { id },
    });

    return res.json({
      success: true,
    });

  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete term",
      error: error.message,
    });
  }
}