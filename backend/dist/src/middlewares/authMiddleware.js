"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../prisma/client");
async function authenticate(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await client_1.prisma.user.findUnique({
            where: { id: decoded.id },
        });
        // ✅ STRICT: User must exist
        if (!user) {
            console.warn("❌ User not found");
            return res.status(401).json({
                message: "Invalid user",
            });
        }
        // ✅ CLEAN USER CONTEXT (NO RELATIONS)
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        return next();
    }
    catch (error) {
        console.warn("❌ Invalid or expired token");
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}
