"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
/**
 * Restrict access to specific user roles.
 * Example:
 *   requireRole(["ADMIN", "TEACHER"])
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: "Forbidden: insufficient privileges" });
        }
        next();
    };
};
exports.requireRole = requireRole;
