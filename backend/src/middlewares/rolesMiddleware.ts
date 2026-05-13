import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { id: number; role: Role };

    if (!user) {
      console.warn("❌ Access denied: unauthenticated request");

      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      console.warn("❌ Access denied: insufficient role permissions");

      return res.status(403).json({
        message: "Forbidden: insufficient privileges",
        requiredRoles: allowedRoles,
      });
    }

    return next();
  };
};