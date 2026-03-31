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

  // ✅ STRICT: No token → reject
  if (!token) {
    console.warn("❌ No token provided");
    return res.status(401).json({
      message: "Authentication required",
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

    // ✅ STRICT: User must exist
    if (!user) {
      console.warn("❌ User not found");
      return res.status(401).json({
        message: "Invalid user",
      });
    }

    const authUser: any = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // 🎓 STUDENT CONTEXT (non-blocking, but logged)
    if (user.role === Role.STUDENT) {
      if (!user.studentProfile) {
        console.warn("⚠️ Student has no profile linked");
      } else {
        authUser.studentId = user.studentProfile.id;
      }
    }

    // 👨‍👩‍👧 PARENT CONTEXT
    if (user.role === Role.PARENT) {
      authUser.studentIds = user.parentStudents.map(
        (ps) => ps.studentId
      );
    }

    req.user = authUser;
    return next();

  } catch (error) {
    console.warn("❌ Invalid or expired token");
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}