import { Request, Response } from "express";
import { prisma } from "../prisma/client";

// ✅ EXISTING FUNCTION (UNCHANGED)
export const getStudentTranscript = async (
  req: Request,
  res: Response
) => {
  const studentId = Number(req.params.id);

  try {
    const transcripts = await prisma.transcript.findMany({
      where: { studentId },
      include: {
        entries: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(transcripts);
  } catch (err) {
    console.error("FETCH TRANSCRIPT ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch transcript",
    });
  }
};

// ✅ NEW FUNCTION — ADD THIS
export const addContactLog = async (
  req: Request,
  res: Response
) => {
  const studentId = Number(req.params.id);
  const { message } = req.body;

  // 🔒 VALIDATION
  if (!message) {
    return res.status(400).json({
      message: "Message is required",
    });
  }

  try {
    const log = await prisma.parentContactLog.create({
      data: {
        studentId,
        message,
        createdAt: new Date(), // ✅ TIMESTAMP
      },
    });

    res.status(201).json(log);
  } catch (err) {
    console.error("ADD CONTACT LOG ERROR:", err);

    res.status(500).json({
      message: "Failed to add contact log",
    });
  }
};

// ✅ (OPTIONAL BUT IMPORTANT) — FETCH DETAILS WITH LOGS
export const getStudentDetails = async (
  req: Request,
  res: Response
) => {
  const studentId = Number(req.params.id);
  const termId = Number(req.query.termId);

  try {
    // attendance count
    const attendance = await prisma.attendanceEntry.count({
      where: {
        studentId,
        status: "ABSENT",

        session: {
          termId,
        },
      },
    });

    const present = await prisma.attendanceEntry.count({
      where: {
        studentId,
        status: "PRESENT",

        session: {
          termId,
        },
      },
    });

    // logs
    const logs = await prisma.parentContactLog.findMany({
      where: { studentId },

      orderBy: {
        createdAt: "desc",
      }, // 🔥 IMPORTANT
    });

    res.json({
      present,
      absent: attendance,
      logs,
    });
  } catch (err) {
    console.error("GET STUDENT DETAILS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch student details",
    });
  }
};

export const updateHealth = async (
  req: Request,
  res: Response
) => {
  const studentId = Number(req.params.id);
  const { healthNotes } = req.body;

  try {
    await prisma.student.update({
      where: { id: studentId },

      data: {
        healthNotes,
      },
    });

    res.json({
      message: "Health notes updated",
    });
  } catch (err) {
    console.error("UPDATE HEALTH ERROR:", err);

    res.status(500).json({
      message: "Failed to update health notes",
    });
  }
};