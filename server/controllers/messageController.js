import { Messages } from '../models/model.messages.js';

const messages = new Messages();

export const getMessagesAll = async (req, res) => {
    try {
        const result = await messages.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesByMember = async (req, res) => {
    try {
        const result = await messages.getByMember()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesByChannel = async (req, res) => {
    try {
        const result = await messages.getByChannel()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
}

export const getMessageById = async (req, res) => {
    const id = req.params.id;
    try {
        const result = await messages.getById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesByMonth = async (req, res) => {
    try {
        const result = await messages.getByMonth();
        
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }
        
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMessagesByMonthByMember = async (req, res) => {
    try {
        const inputData = await messages.getByMonthByMember();
        // Transform data for Recharts
        function transformData(data) {
            const transformedData = {};

            data.forEach((entry) => {
                const { month, user_name, messages } = entry;
                if (!transformedData[month]) {
                    transformedData[month] = {};
                }
                transformedData[month][user_name] = messages;
            });

            return Object.keys(transformedData).map((month) => ({
                month,
                ...transformedData[month],
            }));
        }

        const result = transformData(inputData);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getMessagesStats = async (req, res) => {
    try {
        const result = await messages.getStats();
        
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }
        
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 