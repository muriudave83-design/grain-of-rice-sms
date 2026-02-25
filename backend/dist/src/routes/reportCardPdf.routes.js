"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportCardPdf_controller_1 = require("../controllers/reportCardPdf.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// GET /api/report-cards/:id/pdf
router.get("/report-cards/:id/pdf", authMiddleware_1.authenticate, reportCardPdf_controller_1.getReportCardPdf);
exports.default = router;
