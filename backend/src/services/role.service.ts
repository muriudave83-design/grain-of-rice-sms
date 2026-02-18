import { prisma } from "../prisma/client";
import { Role } from "@prisma/client";

/* ------------------------------------------------------------------ */
/* TEMP stub — Phase 9 Notifications not implemented yet               */
/* Notifications must never block domain logic                          */
/* ------------------------------------------------------------------ */
const NotificationService = {
  emitEvent: (..._args: any[]) => {},
};

export async function assignRole(
  adminUserId: number,
  targetUserId: number,
  newRole: string
) {
  const adminUser = await prisma.user.findUnique({
    where: { id: adminUserId },
  });

  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error("Target user not found");
  }

  // ✅ FIX: cast string to Prisma Role enum
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole as Role },
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
  } catch {}
}

export async function revokeRole(
  adminUserId: number,
  targetUserId: number,
  oldRole: string
) {
  const adminUser = await prisma.user.findUnique({
    where: { id: adminUserId },
  });

  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error("Target user not found");
  }

  // ✅ FIX: cast string to Prisma Role enum
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: oldRole as Role },
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
  } catch {}
}
