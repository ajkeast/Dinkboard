import { queryFirsts, queryScore } from '../models/firstsModel';

export const getFirsts = async (req, res) => {
    const limit = req.params.limit;
    try{
        const result = await queryFirsts(Number(limit));   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getScore = async (req, res) => {
    try{
        const result = await queryScore()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};