"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const reportCardReadRoutes_1 = require("./reportCardReadRoutes");
const router = (0, express_1.Router)();
// ✅ Namespace report routes properly
router.use("/report-cards", authMiddleware_1.authenticate, reportCardReadRoutes_1.reportCardReadRoutes);
// ✅ Protected dashboard test route
router.get("/dashboard", authMiddleware_1.authenticate, (req, res) => {
    res.json({
        message: "Welcome to the protected dashboard!",
        user: req.user,
    });
});
exports.default = router;
