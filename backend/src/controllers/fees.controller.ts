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

export const getFees = async (_req: Request, res: Response) => {
  const fees = await prisma.fee.findMany({
    include: { student: true },
    orderBy: {
      paid: "asc", // least paid first
    },
  });

  res.json(fees);
};

export const createFee = async (req: Request, res: Response) => {
  console.log("🔥 CREATE FEE HIT");
  console.log("BODY:", req.body);

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  const { studentId, amount } = req.body;

  if (!studentId || !amount) {
    console.log("❌ Missing fields");
    return res.status(400).json({ error: "Missing fields" });
  }

  const fee = await prisma.fee.create({
    data: {
      studentId: Number(studentId),
      amount: Number(amount),
      paid: 0,
    },
  });

  console.log("✅ FEE CREATED:", fee);

  res.json(fee);
};

export const payFee = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { amount } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const fee = await prisma.fee.update({
    where: { id },
    data: {
      paid: { increment: Number(amount) },
    },
  });

  res.json(fee);
};

export const updateFee = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { amount } = req.body;

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  const fee = await prisma.fee.update({
    where: { id },
    data: {
      amount: Number(amount),
    },
  });

  res.json(fee);
};

// 🔥 DELETE FEE
export const deleteFee = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // 🔒 LOCK CHECK
  if (await checkSystemLock(res)) return;

  try {
    await prisma.fee.delete({
      where: { id },
    });

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete fee" });
  }
};