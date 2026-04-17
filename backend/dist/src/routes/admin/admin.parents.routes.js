"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../../controllers/adminController");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../../middlewares/rolesMiddleware");
const router = (0, express_1.Router)();
// ✅ CREATE
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.createParent);
// ✅ GET ALL
router.get("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.getParents);
// ✅ GET ONE (🔥 FIXES EDIT PAGE)
router.get("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.getParentById);
// ✅ UPDATE
router.patch("/:id", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.updateParent);
// ✅ ARCHIVE (DEACTIVATE)
router.patch("/:id/archive", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)(["ADMIN"]), adminController_1.archiveParent);
exports.default = router;
