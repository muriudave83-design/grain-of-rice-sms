"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const reportCardRoutes_1 = require("./reportCardRoutes");
const router = (0, express_1.Router)();
// ✅ Protect ALL report card routes
router.use("/", authMiddleware_1.authenticate, reportCardRoutes_1.reportCardReadRoutes);
// ✅ Protected dashboard test route
router.get("/dashboard", authMiddleware_1.authenticate, (req, res) => {
    res.json({
        message: "Welcome to the protected dashboard!",
        user: req.user,
    });
});
exports.default = router;
