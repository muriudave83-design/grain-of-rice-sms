import { Role } from "@prisma/client";
import { Router } from "express";
import {
  addCombinedAssignment,
  changeAdminTeachingGroupStatus,
  createAdminTeachingGroup,
  editCombinedAssignment,
  getAdminTeachingGroupById,
  getAdminTeachingGroups,
  getMyCombinedGradebook,
  getMyTeachingGroups,
  getTeachingGroupOptions,
  lockCombinedAssignment,
  previewCombinedDelete,
  removeCombinedAssignment,
  reorderCombined,
  replaceAdminTeachingGroupMember,
  saveCombinedAssignmentScore,
} from "../controllers/combinedTeachingGroup.controller";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";

const router = Router();

router.get("/admin/teaching-groups/options", authenticate, requireRole([Role.ADMIN]), getTeachingGroupOptions);
router.get("/admin/teaching-groups", authenticate, requireRole([Role.ADMIN]), getAdminTeachingGroups);
router.post("/admin/teaching-groups", authenticate, requireRole([Role.ADMIN]), createAdminTeachingGroup);
router.get("/admin/teaching-groups/:groupId", authenticate, requireRole([Role.ADMIN]), getAdminTeachingGroupById);
router.patch("/admin/teaching-groups/:groupId/status", authenticate, requireRole([Role.ADMIN]), changeAdminTeachingGroupStatus);
router.put("/admin/teaching-groups/:groupId/lanes/:laneId/member", authenticate, requireRole([Role.ADMIN]), replaceAdminTeachingGroupMember);

router.get("/teacher/teaching-groups", authenticate, requireRole([Role.TEACHER]), getMyTeachingGroups);
router.get("/teacher/teaching-groups/:groupId/gradebook", authenticate, requireRole([Role.TEACHER]), getMyCombinedGradebook);
router.post("/teacher/teaching-groups/:groupId/assignments", authenticate, requireRole([Role.TEACHER]), addCombinedAssignment);
router.put("/teacher/teaching-groups/:groupId/assignments/reorder", authenticate, requireRole([Role.TEACHER]), reorderCombined);
router.put("/teacher/teaching-groups/:groupId/assignments/:assignmentId", authenticate, requireRole([Role.TEACHER]), editCombinedAssignment);
router.put("/teacher/teaching-groups/:groupId/assignments/:assignmentId/lock", authenticate, requireRole([Role.TEACHER]), lockCombinedAssignment);
router.get("/teacher/teaching-groups/:groupId/assignments/:assignmentId/delete-preview", authenticate, requireRole([Role.TEACHER]), previewCombinedDelete);
router.delete("/teacher/teaching-groups/:groupId/assignments/:assignmentId", authenticate, requireRole([Role.TEACHER]), removeCombinedAssignment);
router.post("/teacher/teaching-groups/:groupId/scores", authenticate, requireRole([Role.TEACHER]), saveCombinedAssignmentScore);

export default router;
