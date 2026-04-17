"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../prisma/client");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rolesMiddleware_1 = require("../middlewares/rolesMiddleware");
const client_2 = require("@prisma/client");
const router = (0, express_1.Router)();
// CREATE PARENT
router.post("/", authMiddleware_1.authenticate, (0, rolesMiddleware_1.requireRole)([client_2.Role.ADMIN]), async (req, res) => {
    try {
        console.log("CREATE PARENT BODY:", req.body);
        const { name, email, phone } = req.body;
        if (!name || !email) {
            return res.status(400).json({
                message: "name and email are required",
            });
        }
        const parent = await client_1.prisma.parent.create({
            data: {
                name,
                email,
                phone,
            },
        });
        res.status(201).json(parent);
    }
    catch (err) {
        console.error("CREATE PARENT ERROR:", err);
        res.status(500).json({
            message: err.message,
        });
    }
});
exports.default = router;
