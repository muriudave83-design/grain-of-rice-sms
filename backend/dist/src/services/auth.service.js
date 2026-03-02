"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("../prisma/client");
/* ------------------------------------------------------------------ */
/* TEMP stub — Phase 9 not implemented yet                              */
/* Notifications must never block domain logic                          */
/* ------------------------------------------------------------------ */
const NotificationService = {
    emitEvent: (..._args) => { },
};
async function login({ email, password }) {
    const user = await client_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    const isValid = await bcrypt_1.default.compare(password, user.password);
    if (!isValid) {
        throw new Error("Invalid credentials");
    }
    // ✅ Track last login timestamp
    await client_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        role: user.role,
    }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });
    try {
        NotificationService.emitEvent({
            name: "user.login",
            occurredAt: new Date(),
            actor: {
                userId: user.id,
                role: user.role,
            },
            entity: {
                type: "User",
                id: user.id,
            },
            metadata: {
                method: "password",
            },
        });
    }
    catch { }
    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
    };
}
