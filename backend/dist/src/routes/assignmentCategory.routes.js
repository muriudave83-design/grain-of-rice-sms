"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const assignmentCategory_controller_1 = require("../controllers/assignmentCategory.controller");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma")); // ✅ make sure this path is correct
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticate, assignmentCategory_controller_1.listAssignmentCategories);
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), assignmentCategory_controller_1.createAssignmentCategory);
router.put("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), assignmentCategory_controller_1.updateAssignmentCategory);
// ✅ DELETE CATEGORY (SAFE)
router.delete("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_1.Role.ADMIN]), async (req, res) => {
    const { id } = req.params;
    try {
        const categoryId = Number(id);
        // ✅ CHECK: used in assessments
        const inUse = await prisma_1.default.assessment.count({
            where: {
                categoryId: categoryId,
            },
        });
        if (inUse > 0) {
            return res.status(400).json({
                message: "Cannot delete category: it is used in one or more assessments.",
            });
        }
        // ✅ delete safely
        await prisma_1.default.assignmentCategory.delete({
            where: { id: categoryId },
        });
        res.json({ message: "Category deleted" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete category" });
    }
});
exports.default = router;
