-- Additive infrastructure for combined teaching groups. This migration does
-- not backfill or modify any existing academic row.

CREATE TABLE "TeachingGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "TeachingGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeachingGroup_lifecycle_check" CHECK (
        ("isActive" = true AND "endedAt" IS NULL) OR
        ("isActive" = false AND "endedAt" IS NOT NULL)
    )
);

CREATE TABLE "TeachingGroupClass" (
    "id" SERIAL NOT NULL,
    "teachingGroupId" INTEGER NOT NULL,
    "classSubjectId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "TeachingGroupClass_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeachingGroupClass_lifecycle_check" CHECK (
        ("isActive" = true AND "endedAt" IS NULL) OR
        ("isActive" = false AND "endedAt" IS NOT NULL)
    )
);

CREATE TABLE "TeachingGroupMember" (
    "id" SERIAL NOT NULL,
    "teachingGroupClassId" INTEGER NOT NULL,
    "teacherSubjectId" INTEGER NOT NULL,
    "isAssignmentOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "TeachingGroupMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeachingGroupMember_lifecycle_check" CHECK (
        ("isActive" = true AND "endedAt" IS NULL) OR
        ("isActive" = false AND "endedAt" IS NOT NULL)
    )
);

CREATE TABLE "TeachingGroupPeriod" (
    "id" SERIAL NOT NULL,
    "teachingGroupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "TeachingGroupPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeachingGroupTerm" (
    "id" SERIAL NOT NULL,
    "teachingGroupPeriodId" INTEGER NOT NULL,
    "teachingGroupClassId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    CONSTRAINT "TeachingGroupTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CombinedAssignment" (
    "id" SERIAL NOT NULL,
    "teachingGroupPeriodId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "requestKey" VARCHAR(64) NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL DEFAULT 'ASSIGNMENT',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxPoints" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "dateAssigned" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deletedAt" TIMESTAMP(6),
    CONSTRAINT "CombinedAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CombinedAssignment_maxPoints_check" CHECK ("maxPoints" > 0),
    CONSTRAINT "CombinedAssignment_weight_check" CHECK ("weight" > 0)
);

CREATE TABLE "CombinedAssignmentChild" (
    "id" SERIAL NOT NULL,
    "combinedAssignmentId" INTEGER NOT NULL,
    "teachingGroupClassId" INTEGER NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    CONSTRAINT "CombinedAssignmentChild_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeachingGroup_isActive_idx" ON "TeachingGroup"("isActive");
CREATE INDEX "TeachingGroupClass_group_active_idx" ON "TeachingGroupClass"("teachingGroupId", "isActive");
CREATE INDEX "TeachingGroupMember_teacherSubject_active_idx" ON "TeachingGroupMember"("teacherSubjectId", "isActive");
CREATE INDEX "TeachingGroupTerm_termId_idx" ON "TeachingGroupTerm"("termId");
CREATE INDEX "CombinedAssignment_period_position_idx" ON "CombinedAssignment"("teachingGroupPeriodId", "position");

CREATE UNIQUE INDEX "TeachingGroupClass_group_classSubject_key"
    ON "TeachingGroupClass"("teachingGroupId", "classSubjectId");
CREATE UNIQUE INDEX "TeachingGroupMember_class_teacherSubject_key"
    ON "TeachingGroupMember"("teachingGroupClassId", "teacherSubjectId");
CREATE UNIQUE INDEX "TeachingGroupMember_one_active_owner_idx"
    ON "TeachingGroupMember"("teachingGroupClassId")
    WHERE "isActive" = true AND "isAssignmentOwner" = true;
CREATE UNIQUE INDEX "TeachingGroupPeriod_group_name_year_key"
    ON "TeachingGroupPeriod"("teachingGroupId", "name", "academicYear");
CREATE UNIQUE INDEX "TeachingGroupTerm_period_class_key"
    ON "TeachingGroupTerm"("teachingGroupPeriodId", "teachingGroupClassId");
CREATE UNIQUE INDEX "TeachingGroupTerm_period_term_key"
    ON "TeachingGroupTerm"("teachingGroupPeriodId", "termId");
CREATE UNIQUE INDEX "CombinedAssignment_period_request_key"
    ON "CombinedAssignment"("teachingGroupPeriodId", "requestKey");
CREATE UNIQUE INDEX "CombinedAssignmentChild_assignmentId_key"
    ON "CombinedAssignmentChild"("assignmentId");
CREATE UNIQUE INDEX "CombinedAssignmentChild_assignment_class_key"
    ON "CombinedAssignmentChild"("combinedAssignmentId", "teachingGroupClassId");

ALTER TABLE "TeachingGroupClass" ADD CONSTRAINT "TeachingGroupClass_group_fkey"
    FOREIGN KEY ("teachingGroupId") REFERENCES "TeachingGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupClass" ADD CONSTRAINT "TeachingGroupClass_classSubject_fkey"
    FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupMember" ADD CONSTRAINT "TeachingGroupMember_class_fkey"
    FOREIGN KEY ("teachingGroupClassId") REFERENCES "TeachingGroupClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupMember" ADD CONSTRAINT "TeachingGroupMember_teacherSubject_fkey"
    FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupPeriod" ADD CONSTRAINT "TeachingGroupPeriod_group_fkey"
    FOREIGN KEY ("teachingGroupId") REFERENCES "TeachingGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupTerm" ADD CONSTRAINT "TeachingGroupTerm_period_fkey"
    FOREIGN KEY ("teachingGroupPeriodId") REFERENCES "TeachingGroupPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupTerm" ADD CONSTRAINT "TeachingGroupTerm_class_fkey"
    FOREIGN KEY ("teachingGroupClassId") REFERENCES "TeachingGroupClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingGroupTerm" ADD CONSTRAINT "TeachingGroupTerm_term_fkey"
    FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CombinedAssignment" ADD CONSTRAINT "CombinedAssignment_period_fkey"
    FOREIGN KEY ("teachingGroupPeriodId") REFERENCES "TeachingGroupPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CombinedAssignment" ADD CONSTRAINT "CombinedAssignment_creator_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CombinedAssignmentChild" ADD CONSTRAINT "CombinedAssignmentChild_combined_fkey"
    FOREIGN KEY ("combinedAssignmentId") REFERENCES "CombinedAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CombinedAssignmentChild" ADD CONSTRAINT "CombinedAssignmentChild_class_fkey"
    FOREIGN KEY ("teachingGroupClassId") REFERENCES "TeachingGroupClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Cascade points from Assignment (parent) to link metadata (child). Deleting
-- link metadata or CombinedAssignment never deletes the ordinary Assignment.
ALTER TABLE "CombinedAssignmentChild" ADD CONSTRAINT "CombinedAssignmentChild_assignment_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "validate_teaching_group_member"() RETURNS TRIGGER AS $$
DECLARE
    lane_class_id INTEGER;
    lane_subject_id INTEGER;
    member_class_id INTEGER;
    member_subject_id INTEGER;
BEGIN
    SELECT cs."classId", cs."subjectId"
      INTO lane_class_id, lane_subject_id
      FROM "TeachingGroupClass" tgc
      JOIN "ClassSubject" cs ON cs."id" = tgc."classSubjectId"
     WHERE tgc."id" = NEW."teachingGroupClassId";

    SELECT ts."classId", ts."subjectId"
      INTO member_class_id, member_subject_id
      FROM "TeacherSubject" ts
     WHERE ts."id" = NEW."teacherSubjectId";

    IF lane_class_id IS NULL OR member_class_id IS NULL OR
       lane_class_id <> member_class_id OR lane_subject_id <> member_subject_id THEN
        RAISE EXCEPTION 'TeachingGroupMember TeacherSubject must match its ClassSubject lane';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TeachingGroupMember_validate_match"
BEFORE INSERT OR UPDATE OF "teachingGroupClassId", "teacherSubjectId"
ON "TeachingGroupMember"
FOR EACH ROW EXECUTE FUNCTION "validate_teaching_group_member"();

CREATE FUNCTION "validate_teaching_group_term"() RETURNS TRIGGER AS $$
DECLARE
    period_group_id INTEGER;
    lane_group_id INTEGER;
    lane_class_id INTEGER;
    mapped_term_class_id INTEGER;
BEGIN
    SELECT "teachingGroupId" INTO period_group_id
      FROM "TeachingGroupPeriod" WHERE "id" = NEW."teachingGroupPeriodId";
    SELECT tgc."teachingGroupId", cs."classId"
      INTO lane_group_id, lane_class_id
      FROM "TeachingGroupClass" tgc
      JOIN "ClassSubject" cs ON cs."id" = tgc."classSubjectId"
     WHERE tgc."id" = NEW."teachingGroupClassId";
    SELECT "classId" INTO mapped_term_class_id
      FROM "Term" WHERE "id" = NEW."termId";

    IF period_group_id IS NULL OR lane_group_id IS NULL OR period_group_id <> lane_group_id THEN
        RAISE EXCEPTION 'TeachingGroupTerm period and lane must belong to the same TeachingGroup';
    END IF;
    IF mapped_term_class_id IS NULL OR lane_class_id <> mapped_term_class_id THEN
        RAISE EXCEPTION 'TeachingGroupTerm Term must belong to the lane Class';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM "CombinedAssignment" ca
          JOIN "CombinedAssignmentChild" cac ON cac."combinedAssignmentId" = ca."id"
          JOIN "Assignment" a ON a."id" = cac."assignmentId"
         WHERE ca."teachingGroupPeriodId" = NEW."teachingGroupPeriodId"
           AND cac."teachingGroupClassId" = NEW."teachingGroupClassId"
           AND a."termId" <> NEW."termId"
    ) THEN
        RAISE EXCEPTION 'TeachingGroupTerm change would invalidate an existing Assignment child';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TeachingGroupTerm_validate_mapping"
BEFORE INSERT OR UPDATE OF "teachingGroupPeriodId", "teachingGroupClassId", "termId"
ON "TeachingGroupTerm"
FOR EACH ROW EXECUTE FUNCTION "validate_teaching_group_term"();

CREATE FUNCTION "validate_combined_assignment_child"() RETURNS TRIGGER AS $$
DECLARE
    logical_period_id INTEGER;
    period_group_id INTEGER;
    lane_group_id INTEGER;
    expected_term_id INTEGER;
    expected_teacher_subject_id INTEGER;
    child_term_id INTEGER;
    child_teacher_subject_id INTEGER;
BEGIN
    SELECT ca."teachingGroupPeriodId", tgp."teachingGroupId"
      INTO logical_period_id, period_group_id
      FROM "CombinedAssignment" ca
      JOIN "TeachingGroupPeriod" tgp ON tgp."id" = ca."teachingGroupPeriodId"
     WHERE ca."id" = NEW."combinedAssignmentId";
    SELECT "teachingGroupId" INTO lane_group_id
      FROM "TeachingGroupClass" WHERE "id" = NEW."teachingGroupClassId";
    SELECT "termId" INTO expected_term_id
      FROM "TeachingGroupTerm"
     WHERE "teachingGroupPeriodId" = logical_period_id
       AND "teachingGroupClassId" = NEW."teachingGroupClassId";
    SELECT "teacherSubjectId" INTO expected_teacher_subject_id
      FROM "TeachingGroupMember"
     WHERE "teachingGroupClassId" = NEW."teachingGroupClassId"
       AND "isActive" = true AND "isAssignmentOwner" = true;
    SELECT "termId", "teacherSubjectId" INTO child_term_id, child_teacher_subject_id
      FROM "Assignment" WHERE "id" = NEW."assignmentId";

    IF logical_period_id IS NULL OR lane_group_id IS NULL OR period_group_id <> lane_group_id THEN
        RAISE EXCEPTION 'CombinedAssignmentChild lane is outside the logical assignment TeachingGroup';
    END IF;
    IF expected_term_id IS NULL OR child_term_id <> expected_term_id THEN
        RAISE EXCEPTION 'CombinedAssignmentChild Assignment must use the mapped Term';
    END IF;
    IF expected_teacher_subject_id IS NULL OR child_teacher_subject_id <> expected_teacher_subject_id THEN
        RAISE EXCEPTION 'CombinedAssignmentChild Assignment must use the active assignment-owner TeacherSubject';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CombinedAssignmentChild_validate_match"
BEFORE INSERT OR UPDATE OF "combinedAssignmentId", "teachingGroupClassId", "assignmentId"
ON "CombinedAssignmentChild"
FOR EACH ROW EXECUTE FUNCTION "validate_combined_assignment_child"();

CREATE FUNCTION "protect_linked_assignment_coordinates"() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM "CombinedAssignmentChild" WHERE "assignmentId" = OLD."id") AND
       (NEW."termId" <> OLD."termId" OR NEW."teacherSubjectId" <> OLD."teacherSubjectId") THEN
        RAISE EXCEPTION 'Linked combined Assignment term and TeacherSubject cannot be changed directly';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Assignment_protect_combined_coordinates"
BEFORE UPDATE OF "termId", "teacherSubjectId" ON "Assignment"
FOR EACH ROW EXECUTE FUNCTION "protect_linked_assignment_coordinates"();
