"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
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
exports.requireRole = requireRole;
