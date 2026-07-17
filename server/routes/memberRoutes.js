import express from "express";
import { z } from "zod";
import {
    getMembersAll,
    getMemberById
} from "../controllers/memberController.js";
import { validate, snowflakeId } from "../middleware/validate.js";

const router = express.Router();

router.get("/", getMembersAll);
router.get("/:id", validate({ params: z.object({ id: snowflakeId }) }), getMemberById);

export default router;
