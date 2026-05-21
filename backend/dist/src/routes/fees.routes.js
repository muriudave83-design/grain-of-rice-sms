"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fees_controller_1 = require("../controllers/fees.controller");
const router = (0, express_1.Router)();
router.get("/", fees_controller_1.getFees);
router.post("/", fees_controller_1.createFee);
router.put("/:id/pay", fees_controller_1.payFee);
router.put("/:id", fees_controller_1.updateFee);
// 🔥 DELETE FEE
router.delete("/:id", fees_controller_1.deleteFee);
exports.default = router;
