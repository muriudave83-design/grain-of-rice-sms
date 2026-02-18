import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";

interface JwtPayload {
  id: number;
  email: string;
  role: Role;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const tokenFromCookie = req.cookies?.access_token;
  const tokenFromHeader = req.headers.authorization?.split(" ")[1];
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "dev_secret";
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        studentProfile: {
          select: { id: true },
        },
        parentStudents: {
          select: { studentId: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const authUser: any = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // 🎓 STUDENT CONTEXT
    if (user.role === Role.STUDENT) {
      if (!user.studentProfile) {
        return res.status(403).json({
          message: "Student account not linked",
        });
      }

      authUser.studentId = user.studentProfile.id;
    }

    // 👨‍👩‍👧 PARENT CONTEXT
    if (user.role === Role.PARENT) {
      authUser.studentIds = user.parentStudents.map(
        (ps) => ps.studentId
      );
    }

    req.user = authUser;
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}
