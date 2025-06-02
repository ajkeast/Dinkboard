import { Emojis } from '../models/model.emojis.js';

const emojis = new Emojis();

export const getEmojisAll = async (req, res) => {
    try {
        const result = await emojis.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getEmojisCount = async (req, res) => {
    try {
        const result = await emojis.getCount()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
};

export const getEmojisById = async (req, res) => {
    const id = req.params.id;
    try {
        const result = await emojis.getById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
        console.log(error.message);
    }
}; 