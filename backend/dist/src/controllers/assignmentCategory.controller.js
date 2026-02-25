"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssignmentCategory = exports.createAssignmentCategory = exports.listAssignmentCategories = void 0;
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
const createAssignmentCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }
        const category = await client_1.prisma.assignmentCategory.create({
            data: { name },
        });
        res.status(201).json(category);
    }
    catch (err) {
        console.error("Failed to create assignment category:", err);
        res.status(500).json({ message: "Failed to create category" });
    }
};
exports.createAssignmentCategory = createAssignmentCategory;
const updateAssignmentCategory = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, weight } = req.body;
        const updated = await client_1.prisma.assignmentCategory.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(weight !== undefined && { weight: Number(weight) }),
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error("Failed to update category:", err);
        res.status(500).json({ message: "Failed to update category" });
    }
};
exports.updateAssignmentCategory = updateAssignmentCategory;
