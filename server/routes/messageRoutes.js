import express from "express";
import { z } from "zod";
import {
    getMessagesAll,
    getMessagesByMember,
    getMessagesByChannel,
    getMessagesByDay,
    getMessagesChannelsByMember,
    getMessagesMemberSummary,
    getMessageById,
    getMessagesByMonth,
    getMessagesByMonthByMember,
    getMessagesStats
} from "../controllers/messageController.js";
import { validate, snowflakeId } from "../middleware/validate.js";

const router = express.Router();

const memberIdQuery = z.object({ memberId: snowflakeId });
const dayQuery = z
    .object({
        memberId: snowflakeId,
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}([T ].*)?$/, "must be an ISO date (YYYY-MM-DD)").optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}([T ].*)?$/, "must be an ISO date (YYYY-MM-DD)").optional(),
    })
    .refine((q) => Boolean(q.startDate) === Boolean(q.endDate), {
        message: "startDate and endDate must be provided together",
    });

// Order matters! Put specific routes before parameterized routes
router.get("/", getMessagesAll);
router.get("/members", getMessagesByMember);
router.get("/channels/member", validate({ query: memberIdQuery }), getMessagesChannelsByMember);
router.get("/channels", getMessagesByChannel);
router.get("/day", validate({ query: dayQuery }), getMessagesByDay);
router.get("/summary/member", validate({ query: memberIdQuery }), getMessagesMemberSummary);
router.get("/month", getMessagesByMonth);
router.get("/month/member", getMessagesByMonthByMember);
router.get("/stats", getMessagesStats);
// This must come last as it's a catch-all for IDs
router.get("/:id", validate({ params: z.object({ id: snowflakeId }) }), getMessageById);

export default router;
