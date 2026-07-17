import { Firsts } from '../models/model.firsts.js';
import { processTimestamp, groupByUserAndSumMinutes } from '../utils/timestamp.utils.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const firsts = new Firsts();

export const getFirstsAll = asyncHandler(async (req, res) => {
    const result = await firsts.getAll();
    res.status(200).json(result);
});

export const getFirstsFew = asyncHandler(async (req, res) => {
    const limit = req.params.limit;
    const result = await firsts.getFew(Number(limit));
    res.status(200).json(result);
});

export const getFirstsById = asyncHandler(async (req, res) => {
    const result = await firsts.getById(req.params.id);
    res.status(200).json(result ?? null);
});

export const getFirstsScore = asyncHandler(async (req, res) => {
    const result = await firsts.getScore();
    res.status(200).json(result);
});

export const getCumCount = asyncHandler(async (req, res) => {
    const result = await firsts.getCumCount();
    const reorganizedData = {};

    Object.values(result).forEach(entry => {
        const { user_name, timesent, cum_count } = entry;
        if (!reorganizedData[user_name]) {
            reorganizedData[user_name] = { name: user_name, data: [] };
        }
        reorganizedData[user_name].data.push({ timesent, cum_count });
    });
    res.status(200).json(Object.values(reorganizedData));
});

export const getJuice = asyncHandler(async (req, res) => {
    const inputData = await firsts.getAll();
    const result = inputData
        .map(processTimestamp)
        .sort((a, b) => new Date(a.eastern_timestamp) - new Date(b.eastern_timestamp));
    res.status(200).json(result);
});

export const getJuicePerUser = asyncHandler(async (req, res) => {
    const inputData = await firsts.getAll();
    const processedData = inputData.map(processTimestamp);
    const result = groupByUserAndSumMinutes(processedData);
    res.status(200).json(result);
});
