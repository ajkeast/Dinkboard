import express from "express";
import { z } from "zod";
import {
    getEmojisAll,
    getEmojisCount,
    getEmojisById
} from "../controllers/emojiController.js";
import { validate, numericId } from "../middleware/validate.js";

const router = express.Router();

router.get("/", getEmojisAll);
router.get("/count", getEmojisCount);
router.get("/:id", validate({ params: z.object({ id: numericId }) }), getEmojisById);

export default router;
