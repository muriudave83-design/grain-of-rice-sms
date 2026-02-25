"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportStudentsCSV = void 0;
const sync_1 = require("csv-stringify/sync");
const client_1 = require("../prisma/client");
/**
 * Export students as CSV
 */
const exportStudentsCSV = async (req, res) => {
    try {
        const students = await client_1.prisma.student.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNo: true,
                class: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { id: "asc" },
        });
        const records = students.map((s) => [
            s.id,
            s.firstName,
            s.lastName,
            s.admissionNo,
            s.class?.name ?? "",
        ]);
        const header = ["id", "firstName", "lastName", "admissionNo", "className"];
        const csv = (0, sync_1.stringify)([header, ...records]);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="students.csv"');
        res.send(csv);
    }
    catch (err) {
        console.error("exportStudentsCSV error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.exportStudentsCSV = exportStudentsCSV;
