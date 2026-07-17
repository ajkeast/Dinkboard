import { Messages } from '../models/model.messages.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const messages = new Messages();

export const getMessagesAll = asyncHandler(async (req, res) => {
    const result = await messages.getAll();
    res.status(200).json(result);
});

export const getMessagesByMember = asyncHandler(async (req, res) => {
    const result = await messages.getByMember();
    res.status(200).json(result);
});

export const getMessagesByChannel = asyncHandler(async (req, res) => {
    const result = await messages.getByChannel();
    res.status(200).json(result);
});

export const getMessageById = asyncHandler(async (req, res) => {
    const result = await messages.getById(req.params.id);
    res.status(200).json(result ?? null);
});

export const getMessagesByMonth = asyncHandler(async (req, res) => {
    const result = await messages.getByMonth();
    res.status(200).json(result);
});

export const getMessagesByMonthByMember = asyncHandler(async (req, res) => {
    const inputData = await messages.getByMonthByMember();
    // Transform data for Recharts
    const transformedData = {};
    inputData.forEach((entry) => {
        const { month, user_name, messages: count } = entry;
        if (!transformedData[month]) {
            transformedData[month] = {};
        }
        transformedData[month][user_name] = count;
    });
    const result = Object.keys(transformedData).map((month) => ({
        month,
        ...transformedData[month],
    }));
    res.status(200).json(result);
});

// NOTE: intentionally still array-shaped (see TODO in model.messages.js getStats).
export const getMessagesStats = asyncHandler(async (req, res) => {
    const result = await messages.getStats();
    res.status(200).json(result);
});
