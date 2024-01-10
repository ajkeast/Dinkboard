import { queryMembers, queryMember } from '../models/memberModel.js';

export const getMembers = async (req, res) => {
    try{
        const result = await queryMembers()
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getMember = async (req, res) => {
    const id = req.params.id;
    try{
        const result = await queryMember(id);   // must cast as number 
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

