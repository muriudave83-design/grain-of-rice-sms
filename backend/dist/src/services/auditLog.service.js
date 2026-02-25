"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const client_1 = require("../prisma/client");
async function createAuditLog({ action, entityType, entityId, actorUserId, actorRole, metadata, }) {
    try {
        await client_1.prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                actorUserId,
                actorRole,
                metadata,
            },
        });
    }
    catch (error) {
        // 🔒 NON-BLOCKING — audit must never break core flows
        console.error("AuditLog creation failed:", error);
    }
}
