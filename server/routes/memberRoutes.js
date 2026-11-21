import express from "express";
import { z } from "zod";
import {
    getMembersAll,
    getMemberById
} from "../controllers/memberController.js";
import {
    getMemberMinecraft,
    getMemberMinecraftLogins
} from "../controllers/minecraftController.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, snowflakeId } from "../middleware/validate.js";

const router = express.Router();
const idParams = z.object({ id: snowflakeId });

router.get("/", getMembersAll);
router.get("/:id/minecraft/logins", requireAdmin, validate({ params: idParams }), getMemberMinecraftLogins);
router.get("/:id/minecraft", validate({ params: idParams }), getMemberMinecraft);
router.get("/:id", validate({ params: idParams }), getMemberById);

export default router;
