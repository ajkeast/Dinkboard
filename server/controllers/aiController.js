import { AI } from '../models/model.ai.js';

const ai = new AI();

// ChatGPT Controllers
export const getChatGPTUsageByUser = async (req, res) => {
    console.log('Accessing getChatGPTUsageByUser endpoint');
    try {
        const { startDate, endDate } = req.query;
        const result = await ai.getChatGPTUsageByUser(startDate, endDate);
        console.log('ChatGPT user stats result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getChatGPTUsageByUser:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getChatGPTUsageByModel = async (req, res) => {
    console.log('Accessing getChatGPTUsageByModel endpoint');
    try {
        const result = await ai.getChatGPTUsageByModel();
        console.log('ChatGPT model stats result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getChatGPTUsageByModel:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getChatGPTUsageOverTime = async (req, res) => {
    console.log('Accessing getChatGPTUsageOverTime endpoint');
    try {
        const { groupBy = 'day' } = req.query;
        const result = await ai.getChatGPTUsageOverTime(groupBy);
        console.log('ChatGPT timeline result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getChatGPTUsageOverTime:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getRecentChatGPTLogs = async (req, res) => {
    console.log('Accessing getRecentChatGPTLogs endpoint');
    try {
        const { limit = 50 } = req.query;
        const result = await ai.getRecentChatGPTLogs(Number(limit));
        console.log('Recent ChatGPT logs result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getRecentChatGPTLogs:', error);
        res.status(500).json({ message: error.message });
    }
};

// DALL-E Controllers
export const getDalleUsageByUser = async (req, res) => {
    console.log('Accessing getDalleUsageByUser endpoint');
    try {
        const { startDate, endDate } = req.query;
        const result = await ai.getDalleUsageByUser(startDate, endDate);
        console.log('DALL-E user stats result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getDalleUsageByUser:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getDalleUsageOverTime = async (req, res) => {
    console.log('Accessing getDalleUsageOverTime endpoint');
    try {
        const { groupBy = 'day' } = req.query;
        const result = await ai.getDalleUsageOverTime(groupBy);
        console.log('DALL-E timeline result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getDalleUsageOverTime:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getRecentDallePrompts = async (req, res) => {
    console.log('Accessing getRecentDallePrompts endpoint');
    try {
        const { limit = 50 } = req.query;
        const result = await ai.getRecentDallePrompts(Number(limit));
        console.log('Recent DALL-E prompts result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getRecentDallePrompts:', error);
        res.status(500).json({ message: error.message });
    }
};

// Combined Stats Controller
export const getAIUsageStats = async (req, res) => {
    console.log('Accessing getAIUsageStats endpoint');
    try {
        const result = await ai.getAIUsageStats();
        console.log('AI usage stats result:', result);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getAIUsageStats:', error);
        res.status(500).json({ message: error.message });
    }
}; 