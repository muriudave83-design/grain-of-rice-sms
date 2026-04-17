"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTranscripts = exports.saveReportComment = exports.getReportData = exports.bulkUpdateScores = exports.toggleAssignmentLock = exports.reorderAssignments = exports.updateAssignment = exports.deleteAssignment = exports.createAssignment = exports.upsertScore = exports.getClassStudents = exports.getGradebook = exports.getTeacherSubjects = exports.getTeacherClasses = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 🧠 HELPER — VALIDATE SCORE
const isValidScore = (score) => {
    const n = Number(score);
    return !isNaN(n) && n >= 0 && n <= 100;
};
// 🧠 HELPER — DEDUPLICATE
const dedupeUpdates = (updates) => {
    const map = new Map();
    updates.forEach((u) => {
        const key = `${u.studentId}-${u.assignmentId}`;
        map.set(key, u);
    });
    return Array.from(map.values());
};
//
// 🧠 ✅ SINGLE SOURCE OF TRUTH (GRADEBOOK ENGINE)
//
const calculateFinalGradeForStudent = (studentId, assignments) => {
    let total = 0;
    let totalWeight = 0;
    assignments.forEach((assignment) => {
        const scoreObj = assignment.scores.find((s) => s.studentId === studentId);
        if (!scoreObj)
            return;
        const score = Number(scoreObj.score);
        if (isNaN(score))
            return;
        const maxScore = assignment.maxScore || 100;
        const weight = assignment.weight ?? 1;
        const percentage = (score / maxScore) * 100;
        total += percentage * weight;
        totalWeight += weight;
    });
    if (totalWeight === 0)
        return 0;
    return total / totalWeight;
};
const getLetterGrade = (avg) => {
    if (avg >= 80)
        return "A";
    if (avg >= 70)
        return "B";
    if (avg >= 60)
        return "C";
    if (avg >= 50)
        return "D";
    return "F";
};
//
// 📚 TEACHER CORE
//
const getTeacherClasses = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const teacherSubjects = await prisma.teacherSubject.findMany({
            where: { teacherId },
            include: { class: true },
        });
        const classesMap = new Map();
        teacherSubjects.forEach((ts) => {
            if (ts.class) {
                classesMap.set(ts.class.id, ts.class);
            }
        });
        res.json(Array.from(classesMap.values()));
    }
    catch (error) {
        console.error("GET TEACHER CLASSES ERROR:", error);
        res.status(500).json({ message: "Failed to fetch classes" });
    }
};
exports.getTeacherClasses = getTeacherClasses;
const getTeacherSubjects = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const subjects = await prisma.teacherSubject.findMany({
            where: { teacherId },
            include: {
                class: true,
                subject: true,
                assignments: true,
            },
        });
        res.json(subjects);
    }
    catch (error) {
        console.error("GET TEACHER SUBJECTS ERROR:", error);
        res.status(500).json({ message: "Failed to fetch teacher subjects" });
    }
};
exports.getTeacherSubjects = getTeacherSubjects;
const getGradebook = async (req, res) => {
    const { id } = req.params;
    const termId = Number(req.query.termId);
    if (!termId) {
        return res.status(400).json({ error: "termId is required" });
    }
    try {
        const gradebook = await prisma.teacherSubject.findUnique({
            where: { id: Number(id) },
            include: {
                class: {
                    include: { students: true },
                },
                subject: true,
                assignments: {
                    where: { termId },
                    orderBy: { position: "asc" },
                    include: { scores: true },
                },
            },
        });
        if (!gradebook) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(gradebook);
    }
    catch (err) {
        console.error("GET GRADEBOOK ERROR:", err);
        res.status(500).json({ message: "Error fetching gradebook" });
    }
};
exports.getGradebook = getGradebook;
const getClassStudents = async (req, res) => {
    const { classId } = req.params;
    try {
        const students = await prisma.student.findMany({
            where: { classId: Number(classId) },
            select: {
                id: true,
                firstName: true,
                lastName: true,
            },
        });
        res.json(students);
    }
    catch (err) {
        console.error("GET CLASS STUDENTS ERROR:", err);
        res.status(500).json({ message: "Error fetching students" });
    }
};
exports.getClassStudents = getClassStudents;
//
// 🧱 SCORES
//
const upsertScore = async (req, res) => {
    const { studentId, assignmentId, score } = req.body;
    const scoreNumber = Number(score);
    if (!isValidScore(scoreNumber)) {
        return res.status(400).json({ message: "Invalid score" });
    }
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
        });
        if (assignment?.isLocked) {
            return res.status(403).json({
                message: "Assignment is locked",
            });
        }
        const existing = await prisma.score.findFirst({
            where: { studentId, assignmentId },
        });
        const result = existing
            ? await prisma.score.update({
                where: { id: existing.id },
                data: { score: scoreNumber },
            })
            : await prisma.score.create({
                data: { studentId, assignmentId, score: scoreNumber },
            });
        res.json(result);
    }
    catch (err) {
        console.error("UPSERT SCORE ERROR:", err);
        res.status(500).json({ message: "Error saving score" });
    }
};
exports.upsertScore = upsertScore;
//
// 🧱 ASSIGNMENTS (FIXED)
//
const createAssignment = async (req, res) => {
    const { title, teacherSubjectId, weight, type, date, dueDate, maxScore, termId, } = req.body;
    if (!title || !teacherSubjectId || !termId) {
        return res.status(400).json({ message: "Missing fields" });
    }
    try {
        const validTypes = ["HOMEWORK", "QUIZ", "TEST", "PROJECT", "EXAM"];
        const normalizedType = typeof type === "string" ? type.toUpperCase() : null;
        const tsId = Number(teacherSubjectId);
        const last = await prisma.assignment.findFirst({
            where: {
                teacherSubjectId: tsId,
                termId: Number(termId),
            },
            orderBy: { position: "desc" },
        });
        const position = last ? last.position + 1 : 0;
        const assignment = await prisma.assignment.create({
            data: {
                title,
                teacherSubjectId: tsId,
                termId: Number(termId),
                type: normalizedType && validTypes.includes(normalizedType)
                    ? normalizedType
                    : client_2.AssessmentType.HOMEWORK,
                date: date ? new Date(date) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                maxScore: maxScore !== undefined ? Number(maxScore) : null,
                position,
                ...(weight !== undefined && { weight }),
            },
        });
        res.json(assignment);
    }
    catch (err) {
        console.error("CREATE ASSIGNMENT ERROR:", err);
        res.status(500).json({ message: "Error creating assignment" });
    }
};
exports.createAssignment = createAssignment;
const deleteAssignment = async (req, res) => {
    try {
        await prisma.assignment.delete({
            where: { id: Number(req.params.id) },
        });
        res.json({ message: "Deleted" });
    }
    catch (err) {
        console.error("DELETE ASSIGNMENT ERROR:", err);
        res.status(500).json({ message: "Error deleting assignment" });
    }
};
exports.deleteAssignment = deleteAssignment;
const updateAssignment = async (req, res) => {
    try {
        const updated = await prisma.assignment.update({
            where: { id: Number(req.params.id) },
            data: {
                ...(req.body.title !== undefined && { title: req.body.title }),
                ...(req.body.weight !== undefined && { weight: req.body.weight }),
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error("UPDATE ASSIGNMENT ERROR:", err);
        res.status(500).json({ message: "Error updating assignment" });
    }
};
exports.updateAssignment = updateAssignment;
const reorderAssignments = async (req, res) => {
    try {
        const { assignments } = req.body;
        await prisma.$transaction(assignments.map((a) => prisma.assignment.update({
            where: { id: a.id },
            data: { position: a.position },
        })));
        res.json({ success: true });
    }
    catch (err) {
        console.error("REORDER ASSIGNMENTS ERROR:", err);
        res.status(500).json({ error: "Failed to reorder" });
    }
};
exports.reorderAssignments = reorderAssignments;
const toggleAssignmentLock = async (req, res) => {
    try {
        const assignment = await prisma.assignment.update({
            where: { id: Number(req.params.id) },
            data: { isLocked: req.body.isLocked },
        });
        res.json(assignment);
    }
    catch (err) {
        console.error("Lock toggle failed:", err);
        res.status(500).json({ error: "Failed to toggle lock" });
    }
};
exports.toggleAssignmentLock = toggleAssignmentLock;
//
// 🧱 BULK UPDATE SCORES (CSV IMPORT 🚀 WITH PREVIEW MODE)
//
const bulkUpdateScores = async (req, res) => {
    try {
        const { updates, mode = "commit" } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: "No updates provided" });
        }
        const uniqueUpdates = dedupeUpdates(updates);
        const assignmentIds = [
            ...new Set(uniqueUpdates.map((u) => u.assignmentId)),
        ];
        const assignments = await prisma.assignment.findMany({
            where: { id: { in: assignmentIds } },
            select: { id: true, isLocked: true },
        });
        const assignmentMap = new Map(assignments.map((a) => [a.id, a]));
        let updated = 0;
        let skippedLocked = 0;
        let invalid = 0;
        const preview = [];
        const validUpdates = [];
        uniqueUpdates.forEach((u) => {
            const assignment = assignmentMap.get(u.assignmentId);
            const score = Number(u.score);
            let status = "valid";
            if (!assignment) {
                status = "invalid-assignment";
                invalid++;
            }
            else if (assignment.isLocked) {
                status = "locked";
                skippedLocked++;
            }
            else if (!isValidScore(score)) {
                status = "invalid-score";
                invalid++;
            }
            else {
                validUpdates.push({
                    studentId: u.studentId,
                    assignmentId: u.assignmentId,
                    score,
                });
            }
            preview.push({
                ...u,
                status,
            });
        });
        if (mode === "preview") {
            return res.json({
                success: true,
                mode: "preview",
                total: updates.length,
                valid: validUpdates.length,
                skippedLocked,
                invalid,
                preview,
            });
        }
        await prisma.$transaction(validUpdates.map((u) => prisma.score.upsert({
            where: {
                studentId_assignmentId: {
                    studentId: u.studentId,
                    assignmentId: u.assignmentId,
                },
            },
            update: { score: u.score },
            create: u,
        })));
        updated = validUpdates.length;
        res.json({
            success: true,
            mode: "commit",
            updated,
            skippedLocked,
            invalid,
            totalReceived: updates.length,
        });
    }
    catch (err) {
        console.error("Bulk update failed:", err);
        res.status(500).json({ error: "Bulk update failed" });
    }
};
exports.bulkUpdateScores = bulkUpdateScores;
//
// 🧾 REPORTS — NOW TERM-AWARE ✅
//
const getReportData = async (req, res) => {
    try {
        const rawClassId = req.params.classId;
        const termId = Number(req.query.termId);
        const classId = Number(rawClassId);
        if (!rawClassId || isNaN(classId)) {
            return res.status(400).json({
                error: "Invalid or missing classId param",
            });
        }
        if (!termId) {
            return res.status(400).json({
                error: "termId required",
            });
        }
        const teacherId = req.user.id;
        const students = await prisma.student.findMany({
            where: { classId },
        });
        const subjects = await prisma.teacherSubject.findMany({
            where: {
                classId,
                teacherId,
            },
            include: {
                subject: true,
                assignments: {
                    where: {
                        termId: termId, // ✅ CRITICAL FIX
                    },
                    include: { scores: true },
                },
            },
        });
        const comments = await prisma.reportComment.findMany({
            where: {
                student: { classId },
            },
        });
        const result = students.map((student) => {
            const subjectResults = subjects.map((ts) => {
                const assignments = ts.assignments ?? [];
                const avg = calculateFinalGradeForStudent(student.id, assignments);
                const letter = getLetterGrade(avg);
                const commentObj = comments.find((c) => c.studentId === student.id &&
                    c.teacherSubjectId === ts.id);
                return {
                    teacherSubjectId: ts.id,
                    subjectName: ts.subject.name,
                    finalGrade: Number(avg.toFixed(1)),
                    letter,
                    comment: commentObj?.comment || "",
                };
            });
            return {
                studentId: student.id,
                name: `${student.firstName} ${student.lastName}`,
                subjects: subjectResults,
            };
        });
        res.json(result);
    }
    catch (err) {
        console.error("REPORT ERROR FULL STACK:", err);
        res.status(500).json({ error: "Failed to generate report" });
    }
};
exports.getReportData = getReportData;
//
// ✅ SAVE COMMENT (unchanged)
//
const saveReportComment = async (req, res) => {
    try {
        const { studentId, teacherSubjectId, comment } = req.body;
        const saved = await prisma.reportComment.upsert({
            where: {
                studentId_teacherSubjectId: {
                    studentId,
                    teacherSubjectId,
                },
            },
            update: { comment },
            create: { studentId, teacherSubjectId, comment },
        });
        res.json(saved);
    }
    catch (err) {
        console.error("Comment save failed:", err);
        res.status(500).json({ error: "Failed to save comment" });
    }
};
exports.saveReportComment = saveReportComment;
//
// 🧾 TRANSCRIPTS — NOW TERM-AWARE ✅
//
const generateTranscripts = async (req, res) => {
    const { classId, termId } = req.body;
    if (!termId) {
        return res.status(400).json({
            error: "termId required",
        });
    }
    try {
        const students = await prisma.student.findMany({
            where: { classId },
        });
        const subjects = await prisma.teacherSubject.findMany({
            where: { classId },
            include: {
                subject: true,
                assignments: {
                    where: {
                        termId: Number(termId), // ✅ CRITICAL FIX
                    },
                    include: { scores: true },
                },
            },
        });
        for (const student of students) {
            const existing = await prisma.transcript.findUnique({
                where: {
                    studentId_classId_termId: {
                        studentId: student.id,
                        classId,
                        termId: Number(termId),
                    },
                },
            });
            if (existing)
                continue;
            const transcript = await prisma.transcript.create({
                data: {
                    studentId: student.id,
                    classId,
                    termId: Number(termId), // ✅ FIXED
                },
            });
            for (const ts of subjects) {
                const avg = calculateFinalGradeForStudent(student.id, ts.assignments);
                await prisma.transcriptEntry.create({
                    data: {
                        transcriptId: transcript.id,
                        subjectName: ts.subject.name,
                        finalGrade: Number(avg.toFixed(1)),
                        letterGrade: getLetterGrade(avg),
                    },
                });
            }
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("TRANSCRIPT ERROR:", err);
        res.status(500).json({ message: "Failed to generate transcripts" });
    }
};
exports.generateTranscripts = generateTranscripts;
