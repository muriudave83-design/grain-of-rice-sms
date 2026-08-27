import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  CombinedTeachingGroupError,
  createCombinedAssignment,
  createTeachingGroup,
  deleteCombinedAssignment,
  getAdminTeachingGroup,
  getCombinedRoster,
  listAdminTeachingGroups,
  listTeacherGroups,
  previewCombinedAssignmentDelete,
  reorderCombinedAssignments,
  replaceTeachingGroupMember,
  saveCombinedScore,
  setCombinedAssignmentLock,
  setTeachingGroupActive,
  updateCombinedAssignment,
} from "../services/combinedTeachingGroup.service";

function handle(error: unknown, res: Response) {
  if (error instanceof CombinedTeachingGroupError) return res.status(error.status).json({ message: error.message, details: error.details });
  console.error("COMBINED TEACHING GROUP ERROR:", error);
  return res.status(500).json({ message: "Combined teaching group operation failed" });
}

export const getTeachingGroupOptions = async (_req: Request, res: Response) => {
  try {
    const lanes = await prisma.classSubject.findMany({
      where: { class: { isArchived: false }, subject: { isArchived: false } },
      orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
      include: { class: true, subject: true },
    });
    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { isActive: true, teacher: { isArchived: false }, class: { isArchived: false }, subject: { isArchived: false } },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
    const terms = await prisma.term.findMany({ where: { class: { isArchived: false } }, orderBy: [{ academicYear: "desc" }, { name: "asc" }, { class: { name: "asc" } }] });
    res.json({ lanes: lanes.map((lane) => ({ ...lane, teacherSubjects: teacherSubjects.filter((item) => item.classId === lane.classId && item.subjectId === lane.subjectId) })), terms });
  } catch (error) { handle(error, res); }
};

export const createAdminTeachingGroup = async (req: Request, res: Response) => {
  try { res.status(201).json(await createTeachingGroup(prisma, req.body)); } catch (error) { handle(error, res); }
};
export const getAdminTeachingGroups = async (_req: Request, res: Response) => {
  try { res.json(await listAdminTeachingGroups(prisma)); } catch (error) { handle(error, res); }
};
export const getAdminTeachingGroupById = async (req: Request, res: Response) => {
  try {
    const group = await getAdminTeachingGroup(prisma, Number(req.params.groupId));
    if (!group) return res.status(404).json({ message: "Teaching group not found" });
    res.json(group);
  } catch (error) { handle(error, res); }
};
export const changeAdminTeachingGroupStatus = async (req: Request, res: Response) => {
  try {
    if (typeof req.body.active !== "boolean") return res.status(400).json({ message: "active must be a boolean" });
    res.json(await setTeachingGroupActive(prisma, Number(req.params.groupId), req.body.active));
  } catch (error) { handle(error, res); }
};
export const replaceAdminTeachingGroupMember = async (req: Request, res: Response) => {
  try {
    res.json(await replaceTeachingGroupMember(prisma, Number(req.params.groupId), Number(req.params.laneId), Number(req.body.oldTeacherSubjectId), Number(req.body.newTeacherSubjectId), Boolean(req.body.isAssignmentOwner)));
  } catch (error) { handle(error, res); }
};

export const getMyTeachingGroups = async (req: Request, res: Response) => {
  try { res.json(await listTeacherGroups(prisma, req.user!.id)); } catch (error) { handle(error, res); }
};
export const getMyCombinedGradebook = async (req: Request, res: Response) => {
  try { res.json(await getCombinedRoster(prisma, Number(req.params.groupId), req.user!.id, req.query.periodId ? Number(req.query.periodId) : undefined)); } catch (error) { handle(error, res); }
};
export const addCombinedAssignment = async (req: Request, res: Response) => {
  try { res.status(201).json(await createCombinedAssignment(prisma, Number(req.params.groupId), req.user!.id, req.body)); } catch (error) { handle(error, res); }
};
export const editCombinedAssignment = async (req: Request, res: Response) => {
  try { res.json(await updateCombinedAssignment(prisma, Number(req.params.groupId), req.user!.id, Number(req.params.assignmentId), req.body)); } catch (error) { handle(error, res); }
};
export const lockCombinedAssignment = async (req: Request, res: Response) => {
  try {
    if (typeof req.body.isLocked !== "boolean") return res.status(400).json({ message: "isLocked must be a boolean" });
    res.json(await setCombinedAssignmentLock(prisma, Number(req.params.groupId), req.user!.id, Number(req.params.assignmentId), req.body.isLocked));
  } catch (error) { handle(error, res); }
};
export const reorderCombined = async (req: Request, res: Response) => {
  try { res.json(await reorderCombinedAssignments(prisma, Number(req.params.groupId), req.user!.id, Number(req.body.periodId), req.body.assignments)); } catch (error) { handle(error, res); }
};
export const saveCombinedAssignmentScore = async (req: Request, res: Response) => {
  try { res.json(await saveCombinedScore(prisma, Number(req.params.groupId), req.user!.id, req.body)); } catch (error) { handle(error, res); }
};
export const previewCombinedDelete = async (req: Request, res: Response) => {
  try { res.json(await previewCombinedAssignmentDelete(prisma, Number(req.params.groupId), req.user!.id, Number(req.params.assignmentId))); } catch (error) { handle(error, res); }
};
export const removeCombinedAssignment = async (req: Request, res: Response) => {
  try { res.json(await deleteCombinedAssignment(prisma, Number(req.params.groupId), req.user!.id, Number(req.params.assignmentId), req.body?.confirmation)); } catch (error) { handle(error, res); }
};
