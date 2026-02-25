"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssignmentCategories = void 0;
const client_1 = require("../prisma/client");
const listAssignmentCategories = async (_req, res) => {
    try {
        const categories = await client_1.prisma.assignmentCategory.findMany({
            orderBy: { id: "asc" },
        });
        res.json(categories);
    }
    catch (err) {
        console.error("Failed to fetch assignment categories:", err);
        res.status(500).json({ message: "Failed to fetch categories" });
    }
};
exports.listAssignmentCategories = listAssignmentCategories;
