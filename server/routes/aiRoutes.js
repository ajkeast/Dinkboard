import express from "express";
import { z } from "zod";
import {
    getChatGPTUsageByUser,
    getChatGPTUsageByModel,
    getChatGPTUsageOverTime,
    getRecentChatGPTLogs,
    getDalleUsageByUser,
    getDalleUsageOverTime,
    getRecentDallePrompts,
    getAIUsageStats
} from "../controllers/aiController.js";
import { validate, groupByParam, limitParam, dateRangeQuery } from "../middleware/validate.js";

const router = express.Router();

const timelineQuery = z.object({ groupBy: groupByParam.optional() });
const recentQuery = z.object({ limit: limitParam.optional() });

// ChatGPT Routes
router.get("/chatgpt/users", validate({ query: dateRangeQuery }), getChatGPTUsageByUser);
router.get("/chatgpt/models", getChatGPTUsageByModel);
router.get("/chatgpt/timeline", validate({ query: timelineQuery }), getChatGPTUsageOverTime);
router.get("/chatgpt/recent", validate({ query: recentQuery }), getRecentChatGPTLogs);

// DALL-E Routes
router.get("/dalle/users", validate({ query: dateRangeQuery }), getDalleUsageByUser);
router.get("/dalle/timeline", validate({ query: timelineQuery }), getDalleUsageOverTime);
router.get("/dalle/recent", validate({ query: recentQuery }), getRecentDallePrompts);

// Combined Stats Route
router.get("/stats", getAIUsageStats);

export default router;
