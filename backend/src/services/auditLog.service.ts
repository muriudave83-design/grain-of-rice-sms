import { prisma } from "../prisma/client";
import { AuditAction } from "@prisma/client";

/**
 * Uses Prisma's AuditAction enum directly.
 * DO NOT redefine AuditAction anywhere in the codebase.
 */

export interface CreateAuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorUserId: string;
  actorRole: string; // must match Prisma schema
  metadata?: Record<string, any>;
}

export async function createAuditLog({
  action,
  entityType,
  entityId,
  actorUserId,
  actorRole,
  metadata,
}: CreateAuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorUserId,
        actorRole,
        metadata,
      },
    });
  } catch (error) {
    // 🔒 NON-BLOCKING — audit must never break core flows
    console.error("AuditLog creation failed:", error);
  }
}
