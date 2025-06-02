import { Firsts } from '../models/model.firsts.js';
import { processTimestamp, groupByUserAndSumMinutes } from '../utils/timestamp.utils.js';

const firsts = new Firsts();

export const getFirstsAll = async (req, res) => {
    try {
        const result = await firsts.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getFirstsFew = async (req, res) => {
    const limit = req.params.limit;
    try {
        const result = await firsts.getFew(Number(limit));   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getFirstsById = async (req, res) => {
    const id = req.params.id;
    try {
        const result = await firsts.getById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getFirstsScore = async (req, res) => {
    try {
        const result = await firsts.getScore()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getCumCount = async (req, res) => {
    try {
        const result = await firsts.getCumCount()
        const reorganizedData = {};

        Object.values(result).forEach(entry => {
            const { user_name, timesent, cum_count } = entry;
            if (!reorganizedData[user_name]) {
                reorganizedData[user_name] = { name: user_name, data: [] };
            }
            reorganizedData[user_name].data.push({ timesent, cum_count });
        });
        const resultArray = Object.values(reorganizedData);
        res.status(200).json(resultArray);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getJuice = async (req, res) => {
    try {
        const inputData = await firsts.getAll();
        const result = inputData
            .map(processTimestamp)
            .sort((a, b) => new Date(a.eastern_timestamp) - new Date(b.eastern_timestamp));
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getJuicePerUser = async (req, res) => {
    try {
        const inputData = await firsts.getAll();
        const processedData = inputData.map(processTimestamp);
        const result = groupByUserAndSumMinutes(processedData);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
}; 