import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ GET /teacher/classes
export const getTeacherClasses = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: {
        teacherId,
      },
      include: {
        class: true,
      },
    });

    // Extract unique classes
    const classesMap = new Map();

    teacherSubjects.forEach((ts) => {
      if (ts.class) {
        classesMap.set(ts.class.id, ts.class);
      }
    });

    const classes = Array.from(classesMap.values());

    res.json(classes);
  } catch (error) {
    console.error("GET TEACHER CLASSES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
};

// ✅ GET /teacher/subjects
export const getTeacherSubjects = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user.id;

    const subjects = await prisma.teacherSubject.findMany({
      where: {
        teacherId: teacherId,
      },
      include: {
        class: true,
        subject: true,
        assignments: true,
      },
    });

    res.json(subjects);
  } catch (error) {
    console.error("GET TEACHER SUBJECTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch teacher subjects" });
  }
};

// ✅ GET /teacher/gradebook/:id
export const getGradebook = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const gradebook = await prisma.teacherSubject.findUnique({
      where: { id: Number(id) },
      include: {
        class: {
          include: {
            students: true,
          },
        },
        subject: true,
        assignments: {
          include: {
            scores: true,
          },
        },
      },
    });

    if (!gradebook) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(gradebook);
  } catch (err) {
    console.error("GET GRADEBOOK ERROR:", err);
    res.status(500).json({ message: "Error fetching gradebook" });
  }
};

// ✅ POST /teacher/score (UPSERT)
export const upsertScore = async (req: Request, res: Response) => {
  const { studentId, assignmentId, score } = req.body;

  const scoreNumber = Number(score);

  // ✅ Prevent NaN / invalid values
  if (isNaN(scoreNumber)) {
    return res.status(400).json({ message: "Invalid score" });
  }

  try {
    const existing = await prisma.score.findFirst({
      where: {
        studentId,
        assignmentId,
      },
    });

    let result;

    if (existing) {
      result = await prisma.score.update({
        where: { id: existing.id },
        data: { score: scoreNumber },
      });
    } else {
      result = await prisma.score.create({
        data: {
          studentId,
          assignmentId,
          score: scoreNumber,
        },
      });
    }

    res.json(result);
  } catch (err) {
    console.error("UPSERT SCORE ERROR:", err);
    res.status(500).json({ message: "Error saving score" });
  }
};

//
// 🧱 PHASE 5 — ASSIGNMENTS
//

// ✅ CREATE ASSIGNMENT
export const createAssignment = async (req: Request, res: Response) => {
  const { title, teacherSubjectId, weight } = req.body;

  if (!title || !teacherSubjectId) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const assignment = await prisma.assignment.create({
      data: {
        title,
        teacherSubjectId: Number(teacherSubjectId),
        ...(weight !== undefined && { weight }),
      },
    });

    res.json(assignment);
  } catch (err) {
    console.error("CREATE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error creating assignment" });
  }
};

// ✅ DELETE ASSIGNMENT
export const deleteAssignment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.assignment.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error deleting assignment" });
  }
};

// ✅ UPDATE ASSIGNMENT (TITLE + WEIGHT)
export const updateAssignment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, weight } = req.body;

  try {
    const updated = await prisma.assignment.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(weight !== undefined && { weight }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Error updating assignment" });
  }
};