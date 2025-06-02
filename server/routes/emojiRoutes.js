import express from "express";
import {
    getEmojisAll,
    getEmojisCount,
    getEmojisById
} from "../controllers/emojiController.js";

const router = express.Router();

router.get("/", getEmojisAll);
router.get("/count", getEmojisCount);
router.get("/:id", getEmojisById);

export default router; 