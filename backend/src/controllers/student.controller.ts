import { Request, Response } from "express";
import { prisma } from "../prisma/client";

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
    res.status(500).json({ message: "Failed to fetch transcript" });
  }
};