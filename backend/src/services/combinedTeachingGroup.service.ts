import { AssessmentType, Prisma } from "@prisma/client";

export const COMBINED_SCORE_CONFIRMATION = "DELETE ASSIGNMENT";
export const COMBINED_PUBLISHED_CONFIRMATION = "DELETE PUBLISHED ASSIGNMENT";

export class CombinedTeachingGroupError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
const activeLaneWhere = {
  isActive: true,
};

function positiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new CombinedTeachingGroupError(400, `${label} is required`);
  return id;
}

function normalizedType(value: unknown): AssessmentType {
  const type = String(value || "ASSIGNMENT").toUpperCase();
  if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
    throw new CombinedTeachingGroupError(400, "Invalid assignment type");
  }
  return type as AssessmentType;
}

function assertLifecycle(active: boolean, endedAt: Date | null, label: string) {
  if (active === Boolean(endedAt)) throw new CombinedTeachingGroupError(409, `${label} has an invalid lifecycle state`);
}

export async function createTeachingGroup(client: any, input: any) {
  const name = String(input?.name || "").trim();
  const periodName = String(input?.periodName || "").trim();
  const academicYear = String(input?.academicYear || "").trim();
  const lanes = Array.isArray(input?.lanes) ? input.lanes : [];
  if (!name || !periodName || !academicYear) throw new CombinedTeachingGroupError(400, "Name, period name, and academic year are required");
  if (lanes.length < 2) throw new CombinedTeachingGroupError(400, "A combined teaching group requires at least two class lanes");

  return client.$transaction(async (tx: any) => {
    const classSubjectIds = lanes.map((lane: any) => positiveId(lane.classSubjectId, "Class subject"));
    if (new Set(classSubjectIds).size !== classSubjectIds.length) throw new CombinedTeachingGroupError(409, "Duplicate class lane selected");
    const classSubjects = await tx.classSubject.findMany({
      where: { id: { in: classSubjectIds } },
      include: { class: true, subject: true },
    });
    if (classSubjects.length !== lanes.length) throw new CombinedTeachingGroupError(400, "One or more class subjects no longer exist");

    const prepared = [];
    for (const lane of lanes) {
      const classSubject = classSubjects.find((item: any) => item.id === Number(lane.classSubjectId));
      if (!classSubject || classSubject.class.isArchived) throw new CombinedTeachingGroupError(409, "Every lane must use an active class");
      if (classSubject.subject.isArchived) throw new CombinedTeachingGroupError(409, "Every lane must use an active subject");
      const ownerId = positiveId(lane.assignmentOwnerTeacherSubjectId, "Assignment owner");
      const owner = await tx.teacherSubject.findFirst({
        where: { id: ownerId, classId: classSubject.classId, subjectId: classSubject.subjectId, isActive: true, teacher: { isArchived: false } },
        include: { teacher: { select: { id: true, name: true } } },
      });
      if (!owner) throw new CombinedTeachingGroupError(409, `${classSubject.class.name} / ${classSubject.subject.name} needs an active matching teacher assignment`);
      const memberIds = [...new Set([ownerId, ...((lane.memberTeacherSubjectIds || []).map(Number))])];
      const members = await tx.teacherSubject.findMany({
        where: { id: { in: memberIds }, classId: classSubject.classId, subjectId: classSubject.subjectId, isActive: true, teacher: { isArchived: false } },
      });
      if (members.length !== memberIds.length) throw new CombinedTeachingGroupError(409, `A member does not match ${classSubject.class.name} / ${classSubject.subject.name}`);
      const term = await tx.term.findFirst({
        where: { id: positiveId(lane.termId, "Term"), classId: classSubject.classId, isActive: true },
      });
      if (!term) throw new CombinedTeachingGroupError(409, `Selected Term does not belong to ${classSubject.class.name}`);
      prepared.push({ classSubject, ownerId, memberIds, term });
    }

    const group = await tx.teachingGroup.create({ data: { name } });
    const period = await tx.teachingGroupPeriod.create({ data: { teachingGroupId: group.id, name: periodName, academicYear } });
    for (const lane of prepared) {
      const groupClass = await tx.teachingGroupClass.create({
        data: { teachingGroupId: group.id, classSubjectId: lane.classSubject.id },
      });
      await tx.teachingGroupMember.createMany({
        data: lane.memberIds.map((teacherSubjectId: number) => ({
          teachingGroupClassId: groupClass.id,
          teacherSubjectId,
          isAssignmentOwner: teacherSubjectId === lane.ownerId,
        })),
      });
      await tx.teachingGroupTerm.create({
        data: { teachingGroupPeriodId: period.id, teachingGroupClassId: groupClass.id, termId: lane.term.id },
      });
    }
    return getAdminTeachingGroup(tx, group.id);
  }, serializable);
}

export function listAdminTeachingGroups(client: any) {
  return client.teachingGroup.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      classes: { include: { classSubject: { include: { class: true, subject: true } }, members: { include: { teacherSubject: { include: { teacher: true } } } } } },
      periods: { include: { termMappings: { include: { term: true, teachingGroupClass: { include: { classSubject: { include: { class: true } } } } } } } },
    },
  });
}

export function getAdminTeachingGroup(client: any, groupId: number) {
  return client.teachingGroup.findUnique({
    where: { id: groupId },
    include: {
      classes: { include: { classSubject: { include: { class: true, subject: true } }, members: { include: { teacherSubject: { include: { teacher: true } } } } } },
      periods: { include: { termMappings: { include: { term: true, teachingGroupClass: { include: { classSubject: { include: { class: true, subject: true } } } } } }, assignments: true } },
    },
  });
}

export async function setTeachingGroupActive(client: any, groupId: number, active: boolean) {
  return client.$transaction(async (tx: any) => {
    const group = await getAdminTeachingGroup(tx, groupId);
    if (!group) throw new CombinedTeachingGroupError(404, "Teaching group not found");
    const now = new Date();
    if (active) {
      for (const lane of group.classes) {
        if (lane.classSubject.class.isArchived || lane.classSubject.subject.isArchived) throw new CombinedTeachingGroupError(409, "Archived class or subject must be resolved before reactivation");
        const activeMembers = lane.members.filter((member: any) => member.teacherSubject.isActive);
        if (!activeMembers.length || activeMembers.filter((member: any) => member.isAssignmentOwner).length !== 1) {
          throw new CombinedTeachingGroupError(409, "Every lane needs active coverage and exactly one assignment owner");
        }
      }
      await tx.teachingGroup.update({ where: { id: groupId }, data: { isActive: true, endedAt: null } });
      await tx.teachingGroupClass.updateMany({ where: { teachingGroupId: groupId }, data: { isActive: true, endedAt: null } });
    } else {
      await tx.teachingGroupClass.updateMany({ where: { teachingGroupId: groupId, isActive: true }, data: { isActive: false, endedAt: now } });
      await tx.teachingGroup.update({ where: { id: groupId }, data: { isActive: false, endedAt: now } });
    }
    return getAdminTeachingGroup(tx, groupId);
  }, serializable);
}

async function loadWorkspace(client: any, groupId: number, teacherId: number, requireOwner = false) {
  const group = await client.teachingGroup.findFirst({
    where: { id: groupId, isActive: true },
    include: {
      classes: {
        where: activeLaneWhere,
        include: {
          classSubject: { include: { class: true, subject: true } },
          members: { where: { isActive: true }, include: { teacherSubject: true } },
          termMappings: { include: { term: true, period: true } },
        },
      },
      periods: true,
    },
  });
  if (!group) throw new CombinedTeachingGroupError(404, "Combined teaching group not found or inactive");
  assertLifecycle(group.isActive, group.endedAt, "Teaching group");
  if (group.classes.length < 2) throw new CombinedTeachingGroupError(409, "Combined group has fewer than two active lanes");
  for (const lane of group.classes) {
    assertLifecycle(lane.isActive, lane.endedAt, "Teaching group lane");
    const coverage = lane.members.filter((member: any) =>
      member.teacherSubject.teacherId === teacherId &&
      member.teacherSubject.isActive &&
      (!requireOwner || member.isAssignmentOwner),
    );
    if (!coverage.length) throw new CombinedTeachingGroupError(403, requireOwner ? "Assignment-owner coverage is required across every active lane" : "Active teaching coverage is required across every active lane");
    if (lane.classSubject.class.isArchived || lane.classSubject.subject.isArchived) throw new CombinedTeachingGroupError(409, "An archived class or subject blocks combined-group writes");
  }
  return group;
}

export async function listTeacherGroups(client: any, teacherId: number) {
  const groups = await client.teachingGroup.findMany({
    where: { isActive: true, classes: { some: { members: { some: { isActive: true, teacherSubject: { teacherId, isActive: true } } } } } },
    include: { classes: { where: activeLaneWhere, include: { classSubject: { include: { class: true, subject: true } }, members: { where: { isActive: true }, include: { teacherSubject: true } } } }, periods: true },
    orderBy: { name: "asc" },
  });
  return groups.filter((group: any) => group.classes.length >= 2 && group.classes.every((lane: any) => lane.members.some((member: any) => member.teacherSubject.teacherId === teacherId && member.teacherSubject.isActive)));
}

export async function getCombinedRoster(client: any, groupId: number, teacherId: number, periodId?: number) {
  const group = await loadWorkspace(client, groupId, teacherId, false);
  const period = group.periods.find((item: any) => !periodId || item.id === periodId) || group.periods[0];
  if (!period) throw new CombinedTeachingGroupError(409, "Combined group has no configured period");
  const mappings = group.classes.map((lane: any) => lane.termMappings.find((mapping: any) => mapping.teachingGroupPeriodId === period.id));
  if (mappings.some((mapping: any) => !mapping)) throw new CombinedTeachingGroupError(409, "Every active lane needs a Term mapping");
  const classIds = group.classes.map((lane: any) => lane.classSubject.classId);
  const students = await client.student.findMany({ where: { classId: { in: classIds }, isArchived: false }, orderBy: [{ classId: "asc" }, { firstName: "asc" }, { lastName: "asc" }] });
  const assignments = await client.combinedAssignment.findMany({
    where: { teachingGroupPeriodId: period.id, deletedAt: null },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: { children: { include: { assignment: { include: { scores: true } }, teachingGroupClass: true } } },
  });
  return {
    group: { id: group.id, name: group.name },
    period,
    readOnly: mappings.some((mapping: any) => mapping.term.isLocked),
    sections: group.classes.map((lane: any) => ({
      laneId: lane.id,
      class: lane.classSubject.class,
      subject: lane.classSubject.subject,
      term: lane.termMappings.find((mapping: any) => mapping.teachingGroupPeriodId === period.id)?.term,
      students: students.filter((student: any) => student.classId === lane.classSubject.classId),
    })),
    assignments: assignments.map((logical: any) => ({
      ...logical,
      isLocked: logical.children.length > 0 && logical.children.every((child: any) => child.assignment.isLocked),
      scores: logical.children.flatMap((child: any) => child.assignment.scores),
    })),
  };
}

export async function createCombinedAssignment(client: any, groupId: number, teacherId: number, input: any) {
  const periodId = positiveId(input?.periodId, "Period");
  const requestKey = String(input?.requestKey || "").trim();
  const title = String(input?.title || "").trim();
  const maxPoints = Number(input?.maxPoints ?? 100);
  const weight = Number(input?.weight ?? 1);
  if (!requestKey || requestKey.length > 64) throw new CombinedTeachingGroupError(400, "A requestKey of at most 64 characters is required");
  if (!title) throw new CombinedTeachingGroupError(400, "Assignment title is required");
  if (!(maxPoints > 0) || !(weight > 0)) throw new CombinedTeachingGroupError(400, "Weight and maximum points must be greater than zero");
  return client.$transaction(async (tx: any) => {
    const group = await loadWorkspace(tx, groupId, teacherId, true);
    const period = group.periods.find((item: any) => item.id === periodId);
    if (!period) throw new CombinedTeachingGroupError(404, "Period does not belong to this group");
    const existing = await tx.combinedAssignment.findUnique({ where: { teachingGroupPeriodId_requestKey: { teachingGroupPeriodId: periodId, requestKey } }, include: { children: { include: { assignment: true } } } });
    if (existing) return existing;
    const mappings = group.classes.map((lane: any) => ({ lane, mapping: lane.termMappings.find((item: any) => item.teachingGroupPeriodId === periodId) }));
    if (mappings.some((item: any) => !item.mapping)) throw new CombinedTeachingGroupError(409, "Every active lane requires a Term mapping");
    if (mappings.some((item: any) => item.mapping.term.isLocked || !item.mapping.term.isActive)) throw new CombinedTeachingGroupError(409, "A mapped Term is locked or inactive; the combined workspace is read-only");
    const last = await tx.combinedAssignment.findFirst({ where: { teachingGroupPeriodId: periodId, deletedAt: null }, orderBy: { position: "desc" } });
    const logical = await tx.combinedAssignment.create({ data: {
      teachingGroupPeriodId: periodId, createdById: teacherId, requestKey, title,
      type: normalizedType(input?.type), weight, maxPoints, position: last ? last.position + 1 : 0,
      dateAssigned: input?.dateAssigned ? new Date(input.dateAssigned) : null,
      dueDate: input?.dueDate ? new Date(input.dueDate) : null,
    } });
    for (const { lane, mapping } of mappings) {
      const owner = lane.members.find((member: any) => member.isAssignmentOwner && member.isActive && member.teacherSubject.isActive);
      if (!owner || owner.teacherSubject.teacherId !== teacherId) throw new CombinedTeachingGroupError(403, "Assignment-owner coverage changed; retry after Admin resolves membership");
      const child = await tx.assignment.create({ data: {
        title, teacherSubjectId: owner.teacherSubjectId, termId: mapping.termId,
        type: logical.type, weight, maxPoints, position: logical.position,
        dateAssigned: logical.dateAssigned, dueDate: logical.dueDate,
      } });
      await tx.combinedAssignmentChild.create({ data: { combinedAssignmentId: logical.id, teachingGroupClassId: lane.id, assignmentId: child.id } });
    }
    return tx.combinedAssignment.findUnique({ where: { id: logical.id }, include: { children: { include: { assignment: true } } } });
  }, serializable);
}

export async function saveCombinedScore(client: any, groupId: number, teacherId: number, input: any) {
  const combinedAssignmentId = positiveId(input?.combinedAssignmentId, "Combined assignment");
  const studentId = positiveId(input?.studentId, "Student");
  const score = Number(input?.score);
  if (!Number.isFinite(score) || score < 0) throw new CombinedTeachingGroupError(400, "Score must be zero or greater");
  return client.$transaction(async (tx: any) => {
    const group = await loadWorkspace(tx, groupId, teacherId, true);
    const student = await tx.student.findFirst({ where: { id: studentId, isArchived: false } });
    if (!student) throw new CombinedTeachingGroupError(404, "Active student not found");
    const lane = group.classes.find((item: any) => item.classSubject.classId === student.classId);
    if (!lane) throw new CombinedTeachingGroupError(400, "Student does not belong to an active class lane in this group");
    const child = await tx.combinedAssignmentChild.findFirst({
      where: { combinedAssignmentId, teachingGroupClassId: lane.id, combinedAssignment: { period: { teachingGroupId: groupId }, deletedAt: null } },
      include: { assignment: true, combinedAssignment: true },
    });
    if (!child) throw new CombinedTeachingGroupError(409, "No class-specific child assignment exists for this student lane");
    if (input?.assignmentId !== undefined && Number(input.assignmentId) !== child.assignmentId) throw new CombinedTeachingGroupError(400, "Cross-class child assignment injection rejected");
    const mapping = lane.termMappings.find((item: any) => item.teachingGroupPeriodId === child.combinedAssignment.teachingGroupPeriodId);
    if (!mapping || mapping.term.isLocked || !mapping.term.isActive || child.assignment.isLocked) throw new CombinedTeachingGroupError(409, "This combined assignment is locked or inactive");
    if (score > child.assignment.maxPoints) throw new CombinedTeachingGroupError(400, "Score exceeds assignment maximum");
    return tx.score.upsert({
      where: { studentId_assignmentId: { studentId, assignmentId: child.assignmentId } },
      update: { score, maxPoints: child.assignment.maxPoints },
      create: { studentId, assignmentId: child.assignmentId, score, maxPoints: child.assignment.maxPoints },
    });
  }, serializable);
}

async function ownedLogical(tx: any, groupId: number, teacherId: number, logicalId: number) {
  await loadWorkspace(tx, groupId, teacherId, true);
  const logical = await tx.combinedAssignment.findFirst({
    where: { id: logicalId, deletedAt: null, period: { teachingGroupId: groupId } },
    include: { period: true, children: { include: { assignment: { include: { scores: true, teacherSubject: true, term: true } }, teachingGroupClass: true } } },
  });
  if (!logical) throw new CombinedTeachingGroupError(404, "Combined assignment not found");
  return logical;
}

export async function updateCombinedAssignment(client: any, groupId: number, teacherId: number, logicalId: number, input: any) {
  return client.$transaction(async (tx: any) => {
    const logical = await ownedLogical(tx, groupId, teacherId, logicalId);
    if (logical.children.some((child: any) => child.assignment.term?.isLocked || child.assignment.isLocked)) throw new CombinedTeachingGroupError(409, "A child assignment or Term is locked");
    const data: any = {};
    for (const key of ["title", "weight", "maxPoints", "dateAssigned", "dueDate"]) if (input[key] !== undefined) data[key] = input[key];
    if (data.title !== undefined) data.title = String(data.title).trim();
    if (data.weight !== undefined) data.weight = Number(data.weight);
    if (data.maxPoints !== undefined) data.maxPoints = Number(data.maxPoints);
    if (data.dateAssigned !== undefined) data.dateAssigned = data.dateAssigned ? new Date(data.dateAssigned) : null;
    if (data.dueDate !== undefined) data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (input.type !== undefined) data.type = normalizedType(input.type);
    if (!data.title && input.title !== undefined) throw new CombinedTeachingGroupError(400, "Title cannot be empty");
    if (data.weight !== undefined && !(data.weight > 0) || data.maxPoints !== undefined && !(data.maxPoints > 0)) throw new CombinedTeachingGroupError(400, "Weight and maximum points must be greater than zero");
    await tx.combinedAssignment.update({ where: { id: logical.id }, data });
    await tx.assignment.updateMany({ where: { id: { in: logical.children.map((child: any) => child.assignmentId) } }, data });
    return tx.combinedAssignment.findUnique({ where: { id: logical.id }, include: { children: { include: { assignment: true } } } });
  }, serializable);
}

export async function setCombinedAssignmentLock(client: any, groupId: number, teacherId: number, logicalId: number, isLocked: boolean) {
  return client.$transaction(async (tx: any) => {
    const logical = await ownedLogical(tx, groupId, teacherId, logicalId);
    if (logical.children.some((child: any) => child.assignment.term.isLocked || !child.assignment.term.isActive)) throw new CombinedTeachingGroupError(409, "A mapped Term is locked or inactive");
    if (!isLocked) {
      for (const child of logical.children) {
        if (child.assignment.term.isLocked) throw new CombinedTeachingGroupError(409, "A mapped Term is locked");
        if (await tx.grade.findFirst({ where: { subjectId: child.assignment.teacherSubject.subjectId, termId: child.assignment.termId, student: { classId: child.assignment.teacherSubject.classId } } })) {
          throw new CombinedTeachingGroupError(409, "Published final-grade assignments cannot be unlocked");
        }
      }
    }
    await tx.assignment.updateMany({ where: { id: { in: logical.children.map((child: any) => child.assignmentId) } }, data: { isLocked } });
    return { id: logical.id, isLocked };
  }, serializable);
}

export async function reorderCombinedAssignments(client: any, groupId: number, teacherId: number, periodId: number, assignments: any[]) {
  if (!Array.isArray(assignments) || !assignments.length) throw new CombinedTeachingGroupError(400, "Assignments are required");
  return client.$transaction(async (tx: any) => {
    const group = await loadWorkspace(tx, groupId, teacherId, true);
    if (group.classes.some((lane: any) => lane.termMappings.some((mapping: any) => mapping.teachingGroupPeriodId === periodId && (mapping.term.isLocked || !mapping.term.isActive)))) throw new CombinedTeachingGroupError(409, "A mapped Term is locked or inactive");
    const ids = assignments.map((item) => positiveId(item.id, "Combined assignment"));
    const logical = await tx.combinedAssignment.findMany({ where: { id: { in: ids }, teachingGroupPeriodId: periodId, deletedAt: null }, include: { children: true } });
    if (logical.length !== ids.length) throw new CombinedTeachingGroupError(403, "Cannot reorder assignments outside this combined period");
    for (const item of assignments) {
      const position = Number(item.position);
      const current = logical.find((row: any) => row.id === Number(item.id));
      await tx.combinedAssignment.update({ where: { id: current.id }, data: { position } });
      await tx.assignment.updateMany({ where: { id: { in: current.children.map((child: any) => child.assignmentId) } }, data: { position } });
    }
    return { success: true };
  }, serializable);
}

export async function previewCombinedAssignmentDelete(client: any, groupId: number, teacherId: number, logicalId: number) {
  const logical = await ownedLogical(client, groupId, teacherId, logicalId);
  const lanes = [];
  for (const child of logical.children) {
    const publishedGradeCount = await client.grade.count({ where: { subjectId: child.assignment.teacherSubject.subjectId, termId: child.assignment.termId, student: { classId: child.assignment.teacherSubject.classId } } });
    lanes.push({ teachingGroupClassId: child.teachingGroupClassId, classId: child.assignment.teacherSubject.classId, termId: child.assignment.termId, scoreCount: child.assignment.scores.length, publishedGradeCount });
  }
  const scoreCount = lanes.reduce((sum, lane) => sum + lane.scoreCount, 0);
  const publishedGradeCount = lanes.reduce((sum, lane) => sum + lane.publishedGradeCount, 0);
  return { id: logical.id, title: logical.title, lanes, scoreCount, publishedGradeCount, requiredConfirmation: publishedGradeCount ? COMBINED_PUBLISHED_CONFIRMATION : scoreCount ? COMBINED_SCORE_CONFIRMATION : null };
}

export async function deleteCombinedAssignment(client: any, groupId: number, teacherId: number, logicalId: number, confirmation?: unknown) {
  return client.$transaction(async (tx: any) => {
    const preview = await previewCombinedAssignmentDelete(tx, groupId, teacherId, logicalId);
    if (preview.requiredConfirmation && confirmation !== preview.requiredConfirmation) throw new CombinedTeachingGroupError(409, "Explicit destructive confirmation is required", preview);
    const logical = await ownedLogical(tx, groupId, teacherId, logicalId);
    if (logical.children.some((child: any) => child.assignment.term.isLocked || !child.assignment.term.isActive)) throw new CombinedTeachingGroupError(409, "A mapped Term is locked or inactive");
    for (const child of logical.children) {
      await tx.score.deleteMany({ where: { assignmentId: child.assignmentId } });
      const lanePreview = preview.lanes.find((lane) => lane.teachingGroupClassId === child.teachingGroupClassId)!;
      if (lanePreview.publishedGradeCount) await tx.grade.deleteMany({ where: { subjectId: child.assignment.teacherSubject.subjectId, termId: child.assignment.termId, student: { classId: child.assignment.teacherSubject.classId } } });
      await tx.assignment.delete({ where: { id: child.assignmentId } });
    }
    await tx.combinedAssignment.update({ where: { id: logical.id }, data: { deletedAt: new Date() } });
    return { ...preview, deleted: true };
  }, serializable);
}

export async function assertNotCombinedChild(client: any, assignmentIds: number[]) {
  const linked = await client.combinedAssignmentChild.findFirst({ where: { assignmentId: { in: assignmentIds } }, select: { assignmentId: true, combinedAssignmentId: true } });
  if (linked) throw new CombinedTeachingGroupError(409, "This assignment belongs to a combined teaching group. Use the combined gradebook endpoint.", linked);
}

export async function replaceTeachingGroupMember(client: any, groupId: number, laneId: number, oldTeacherSubjectId: number, newTeacherSubjectId: number, assignmentOwner: boolean) {
  return client.$transaction(async (tx: any) => {
    const lane = await tx.teachingGroupClass.findFirst({ where: { id: laneId, teachingGroupId: groupId }, include: { classSubject: true } });
    if (!lane) throw new CombinedTeachingGroupError(404, "Teaching group lane not found");
    const replacement = await tx.teacherSubject.findFirst({ where: { id: newTeacherSubjectId, classId: lane.classSubject.classId, subjectId: lane.classSubject.subjectId, isActive: true } });
    if (!replacement) throw new CombinedTeachingGroupError(409, "Replacement teacher assignment does not match the lane");
    const now = new Date();
    await tx.teachingGroupMember.updateMany({ where: { teachingGroupClassId: laneId, teacherSubjectId: oldTeacherSubjectId, isActive: true }, data: { isActive: false, isAssignmentOwner: false, endedAt: now } });
    if (assignmentOwner) await tx.teachingGroupMember.updateMany({ where: { teachingGroupClassId: laneId, isActive: true, isAssignmentOwner: true }, data: { isAssignmentOwner: false } });
    return tx.teachingGroupMember.upsert({
      where: { teachingGroupClassId_teacherSubjectId: { teachingGroupClassId: laneId, teacherSubjectId: newTeacherSubjectId } },
      update: { isActive: true, isAssignmentOwner: assignmentOwner, endedAt: null, startedAt: now },
      create: { teachingGroupClassId: laneId, teacherSubjectId: newTeacherSubjectId, isActive: true, isAssignmentOwner: assignmentOwner },
    });
  }, serializable);
}
