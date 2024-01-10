import { Firsts } from '../models/firstModel.js';

const firsts = new Firsts;

export const getFirstsAll = async (req, res) => {
    try{
        const result = await firsts.getAll()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getFirstsSome = async (req, res) => {
    const limit = req.params.limit;
    try{
        const result = await firsts.getSome(Number(limit));   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getFirstsById = async (req, res) => {
    const limit = req.params.id;
    try{
        const result = await firsts.getById(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getFirstsScore = async (req, res) => {
    try{
        const result = await firsts.getScore()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};