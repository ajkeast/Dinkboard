import express from "express";
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

const router = express.Router();

// ChatGPT Routes
router.get("/chatgpt/users", getChatGPTUsageByUser);
router.get("/chatgpt/models", getChatGPTUsageByModel);
router.get("/chatgpt/timeline", getChatGPTUsageOverTime);
router.get("/chatgpt/recent", getRecentChatGPTLogs);

// DALL-E Routes
router.get("/dalle/users", getDalleUsageByUser);
router.get("/dalle/timeline", getDalleUsageOverTime);
router.get("/dalle/recent", getRecentDallePrompts);

// Combined Stats Route
router.get("/stats", getAIUsageStats);

export default router; 