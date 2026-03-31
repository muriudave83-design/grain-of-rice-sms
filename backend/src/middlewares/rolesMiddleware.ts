import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

/**
 * Restrict access to specific user roles.
 * Example:
 *   requireRole(["ADMIN", "TEACHER"])
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // ❌ Not authenticated (real failure)
    if (!user) {
      console.warn("❌ Access denied: No user on request");

      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    // ❌ Role not allowed (real failure, but now transparent)
    if (!allowedRoles.includes(user.role)) {
      console.warn(
        `❌ Access denied: role '${user.role}' not in [${allowedRoles.join(", ")}]`
      );

      return res.status(403).json({
        message: "Forbidden: insufficient privileges",
        requiredRoles: allowedRoles,
        userRole: user.role,
      });
    }

    // ✅ Authorized
    return next();
  };
};