import { Firsts } from '../models/model.firsts.js';
import { Emojis } from '../models/model.emojis.js';
import { Member } from '../models/model.members.js';
import { Messages } from '../models/model.messages.js';

// =======================================================================
//                                  FIRSTS
// =======================================================================

const firsts = new Firsts;

export const getFirstsAll = async (req, res) => {
    try{
        const result = await firsts.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getFirstsFew = async (req, res) => {
    const limit = req.params.limit;
    try{
        const result = await firsts.getFew(Number(limit));   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getFirstsById = async (req, res) => {
    const limit = req.params.id;
    try{
        const result = await firsts.getById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getFirstsScore = async (req, res) => {
    try{
        const result = await firsts.getScore()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getCumCount = async (req, res) => {
    try{
        // Middleware to format the data for Recharts
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

// =======================================================================
//                                  EMOJIS
// =======================================================================

const emojis = new Emojis;

export const getEmojisAll = async (req, res) => {
    try{
        const result = await emojis.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getEmojisCount = async (req, res) => {
    try{
        const result = await emojis.getCount()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getEmojisById = async (req, res) => {
    const limit = req.params.id;
    try{
        const result = await emojis.getById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

// =======================================================================
//                                  MEMBERS
// =======================================================================

const member = new Member

export const getMembersAll = async (req, res) => {
    try{
        const result = await member.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMemberById = async (req, res) => {
    const id = req.params.id;
    try{
        const result = await queryMember(id);   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

// =======================================================================
//                                  MESSAGES
// =======================================================================

const messages = new Messages

export const getMessagesAll = async (req, res) => {
    try{
        const result = await messages.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesByChannel = async (req, res) => {
    try{
        const result = await messages.getByChannel()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
}

export const getMessageById = async (req, res) => {
    const id = req.params.id;
    try{
        const result = await messages.getById(id);   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesByMonth = async (req, res) => {
    try{
        const result = await messages.getByMonth()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesByMonthByMember = async (req, res) => {
    try {
        const inputData = await messages.getByMonthByMember();
        // Middleware to format the data for Recharts
        function transformData(data) {
        // Create an object to store the transformed data
        const transformedData = {};

        // Iterate through the original data
        data.forEach((entry) => {
            const { month, user_name, messages } = entry;

          // If the month is not a key in transformedData, create an object for that month
            if (!transformedData[month]) {
                transformedData[month] = {};
            }

            // Assign the messages count to the user_name for that month
            transformedData[month][user_name] = messages;
        });

        // Convert the transformed data object into an array of objects
        const result = Object.keys(transformedData).map((month) => ({
            month,
            ...transformedData[month],
        }));

        return result;
        }

        const transformedData = transformData(inputData);

        res.status(200).json(transformedData);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesStats = async (req, res) => {
    try{
        const result = await messages.getStats()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
}