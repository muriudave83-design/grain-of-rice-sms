import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rolesMiddleware";
import { Role } from "@prisma/client";

const router = Router();

// CREATE PARENT
router.post(
  "/",
  authenticate,
  requireRole([Role.ADMIN]),
  async (req, res) => {
    try {
      console.log("CREATE PARENT BODY:", req.body);

      const { name, email, phone } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          message: "name and email are required",
        });
      }

      const parent = await prisma.parent.create({
        data: {
          name,
          email,
          phone,
        },
      });

      res.status(201).json(parent);
    } catch (err: any) {
      console.error("CREATE PARENT ERROR:", err);

      res.status(500).json({
        message: err.message,
      });
    }
  }
);

export default router;