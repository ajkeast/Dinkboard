import { AI } from '../models/model.ai.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ai = new AI();

// ChatGPT Controllers
export const getChatGPTUsageByUser = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const result = await ai.getChatGPTUsageByUser(startDate, endDate);
    res.status(200).json(result);
});

export const getChatGPTUsageByModel = asyncHandler(async (req, res) => {
    const result = await ai.getChatGPTUsageByModel();
    res.status(200).json(result);
});

export const getChatGPTUsageOverTime = asyncHandler(async (req, res) => {
    const { groupBy = 'day' } = req.query;
    const result = await ai.getChatGPTUsageOverTime(groupBy);
    res.status(200).json(result);
});

export const getRecentChatGPTLogs = asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const result = await ai.getRecentChatGPTLogs(Number(limit));
    res.status(200).json(result);
});

// DALL-E Controllers
export const getDalleUsageByUser = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const result = await ai.getDalleUsageByUser(startDate, endDate);
    res.status(200).json(result);
});

export const getDalleUsageOverTime = asyncHandler(async (req, res) => {
    const { groupBy = 'day' } = req.query;
    const result = await ai.getDalleUsageOverTime(groupBy);
    res.status(200).json(result);
});

export const getRecentDallePrompts = asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const result = await ai.getRecentDallePrompts(Number(limit));
    res.status(200).json(result);
});

// Combined Stats Controller — returns a single stats OBJECT (fixed shape).
export const getAIUsageStats = asyncHandler(async (req, res) => {
    const result = await ai.getAIUsageStats();
    res.status(200).json(result);
});
