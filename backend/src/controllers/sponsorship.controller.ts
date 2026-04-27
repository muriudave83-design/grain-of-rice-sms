import { Request, Response } from "express";
import prisma from "../prisma";

// 🔒 GLOBAL LOCK CHECK
const checkSystemLock = async (res: Response) => {
  const locked = await prisma.term.findFirst({
    where: { isLocked: true },
  });

  if (locked) {
    res.status(400).json({ message: "System locked" });
    return true;
  }

  return false;
};

export const getSponsorships = async (_req: Request, res: Response) => {
  const data = await prisma.sponsorship.findMany({
    include: {
      student: true,
      sponsor: true,
    },
  });

  res.json(data);
};

export const createSponsorship = async (req: Request, res: Response) => {
  const { studentId, sponsorName, type } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  if (!studentId || !sponsorName || !type) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Always create a new sponsor
  const sponsor = await prisma.sponsor.create({
    data: { name: sponsorName },
  });

  const sponsorship = await prisma.sponsorship.create({
    data: {
      studentId: Number(studentId),
      sponsorId: sponsor.id,
      type,
    },
  });

  res.json(sponsorship);
};

// ✅ UPDATE SPONSORSHIP
export const updateSponsorship = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { type } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  const data = await prisma.sponsorship.update({
    where: { id },
    data: { type },
  });

  res.json(data);
};

// 🔥 DELETE SPONSORSHIP
export const deleteSponsorship = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  try {
    await prisma.sponsorship.delete({
      where: { id },
    });

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete sponsorship" });
  }
};