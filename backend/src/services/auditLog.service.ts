import { prisma } from "../prisma/client";

export type AuditAction =
  | "USER_LOGIN"
  | "USER_CREATED"
  | "PASSWORD_CHANGED"   // ✅ ADDED
  | "ROLE_CHANGED"
  | "REPORT_CARD_PUBLISHED"
  | "ATTENDANCE_SUBMITTED";

export interface CreateAuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorUserId: string;
  actorRole: string; // ✅ REQUIRED — matches Prisma schema
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
