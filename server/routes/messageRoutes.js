import express from "express";
import { z } from "zod";
import {
    getMessagesAll,
    getMessagesByMember,
    getMessagesByChannel,
    getMessageById,
    getMessagesByMonth,
    getMessagesByMonthByMember,
    getMessagesStats
} from "../controllers/messageController.js";
import { validate, snowflakeId } from "../middleware/validate.js";

const router = express.Router();

// Order matters! Put specific routes before parameterized routes
router.get("/", getMessagesAll);
router.get("/members", getMessagesByMember);
router.get("/channels", getMessagesByChannel);
router.get("/month", getMessagesByMonth);
router.get("/month/member", getMessagesByMonthByMember);
router.get("/stats", getMessagesStats);
// This must come last as it's a catch-all for IDs
router.get("/:id", validate({ params: z.object({ id: snowflakeId }) }), getMessageById);

export default router;
