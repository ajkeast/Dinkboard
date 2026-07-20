import express from "express";
import { z } from "zod";
import {
    getVibeStats,
    getVibeTimeline,
    getVibeEmotions,
    getVibeMembers,
    getMemberVibe,
} from "../controllers/sentimentController.js";
import { validate, snowflakeId } from "../middleware/validate.js";

const router = express.Router();

export const vibeRangeParam = z.enum(["week", "month", "year"]);

const rangeQuery = z.object({
    range: vibeRangeParam.default("month"),
});

const memberParams = z.object({
    memberId: snowflakeId,
});

const memberQuery = z.object({
    range: vibeRangeParam.optional(),
});

router.get("/stats", validate({ query: rangeQuery }), getVibeStats);
router.get("/timeline", validate({ query: rangeQuery }), getVibeTimeline);
router.get("/emotions", validate({ query: rangeQuery }), getVibeEmotions);
router.get("/members", validate({ query: rangeQuery }), getVibeMembers);
router.get(
    "/member/:memberId",
    validate({ params: memberParams, query: memberQuery }),
    getMemberVibe
);

export default router;
