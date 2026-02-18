import { Request, Response } from "express";
import { prisma } from "../prisma/client";

/**
 * GET /admin/audit-logs
 * Admin-only read access to system audit logs
 *
 * Supports:
 * - Pagination
 * - Filtering by action, entityType, actorUserId
 * - Date range filtering
 */
export async function getAuditLogs(req: Request, res: Response) {
  const {
    page = "1",
    limit = "20",
    action,
    entityType,
    actorUserId,
    dateFrom,
    dateTo,
  } = req.query;

  const where: any = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (actorUserId) where.actorUserId = actorUserId as string;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
    if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Number(limit), 100);
  const skip = (pageNumber - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
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
