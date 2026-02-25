"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const client_1 = require("../prisma/client");
/**
 * GET /admin/audit-logs
 * Admin-only read access to system audit logs
 *
 * Supports:
 * - Pagination
 * - Filtering by action, entityType, actorUserId
 * - Date range filtering
 */
async function getAuditLogs(req, res) {
    const { page = "1", limit = "20", action, entityType, actorUserId, dateFrom, dateTo, } = req.query;
    const where = {};
    if (action)
        where.action = action;
    if (entityType)
        where.entityType = entityType;
    if (actorUserId)
        where.actorUserId = actorUserId;
    if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom)
            where.createdAt.gte = new Date(dateFrom);
        if (dateTo)
            where.createdAt.lte = new Date(dateTo);
    }
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.min(Number(limit), 100);
    const skip = (pageNumber - 1) * pageSize;
    const [logs, total] = await Promise.all([
        client_1.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
        }),
        client_1.prisma.auditLog.count({ where }),
    ]);
    return res.json({
        data: logs,
        meta: {
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    });
}
