"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get("/dashboard", authMiddleware_1.authenticate, (req, res) => {
    res.json({
        message: "Welcome to the protected dashboard!",
        user: req.user,
    });
});
exports.default = router;
