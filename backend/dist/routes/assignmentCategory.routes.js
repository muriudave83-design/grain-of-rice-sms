"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const assignmentCategory_controller_1 = require("../controllers/assignmentCategory.controller");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticate, assignmentCategory_controller_1.listAssignmentCategories);
exports.default = router;
