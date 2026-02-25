"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRole = assignRole;
exports.revokeRole = revokeRole;
const client_1 = require("../prisma/client");
/* ------------------------------------------------------------------ */
/* TEMP stub — Phase 9 Notifications not implemented yet               */
/* Notifications must never block domain logic                          */
/* ------------------------------------------------------------------ */
const NotificationService = {
    emitEvent: (..._args) => { },
};
async function assignRole(adminUserId, targetUserId, newRole) {
    const adminUser = await client_1.prisma.user.findUnique({
        where: { id: adminUserId },
    });
    if (!adminUser) {
        throw new Error("Admin user not found");
    }
    const targetUser = await client_1.prisma.user.findUnique({
        where: { id: targetUserId },
    });
    if (!targetUser) {
        throw new Error("Target user not found");
    }
    // ✅ FIX: cast string to Prisma Role enum
    await client_1.prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
    });
    try {
        NotificationService.emitEvent({
            name: "role.assign",
            occurredAt: new Date(),
            actor: {
                userId: adminUser.id,
                role: adminUser.role,
            },
            entity: {
                type: "User",
                id: targetUser.id,
            },
            metadata: {
                assignedRole: newRole,
            },
        });
    }
    catch { }
}
async function revokeRole(adminUserId, targetUserId, oldRole) {
    const adminUser = await client_1.prisma.user.findUnique({
        where: { id: adminUserId },
    });
    if (!adminUser) {
        throw new Error("Admin user not found");
    }
    const targetUser = await client_1.prisma.user.findUnique({
        where: { id: targetUserId },
    });
    if (!targetUser) {
        throw new Error("Target user not found");
    }
    // ✅ FIX: cast string to Prisma Role enum
    await client_1.prisma.user.update({
        where: { id: targetUserId },
        data: { role: oldRole },
    });
    try {
        NotificationService.emitEvent({
            name: "role.revoke",
            occurredAt: new Date(),
            actor: {
                userId: adminUser.id,
                role: adminUser.role,
            },
            entity: {
                type: "User",
                id: targetUser.id,
            },
            metadata: {
                revokedRole: oldRole,
            },
        });
    }
    catch { }
}
