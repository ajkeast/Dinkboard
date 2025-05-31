import { BaseModel } from "./BaseModel.js";

export class Member extends BaseModel {
    constructor() {
        super('members');
    }

    async getAll() {
        return await this.findAll({
            fields: [
                'id',
                'user_name',
                'COALESCE(display_name, user_name) AS display_name',
                'avatar',
                "DATE_FORMAT(created_at, '%b %e, %Y') AS created_at",
                "DATE_FORMAT(last_updated, '%b %e, %Y %h:%i%p UTC') AS last_updated"
            ]
        });
    }

    async getById(id) {
        return await this.findById(id, {
            fields: [
                'id',
                'user_name',
                'COALESCE(display_name, user_name) AS display_name',
                'avatar',
                "DATE_FORMAT(created_at, '%b %e, %Y') AS created_at",
                "DATE_FORMAT(last_updated, '%b %e, %Y %h:%i%p UTC') AS last_updated"
            ]
        });
    }

    // Add new methods for better functionality
    async createMember(data) {
        const { user_name, display_name, avatar } = data;
        return await this.create({
            user_name,
            display_name,
            avatar,
            created_at: new Date(),
            last_updated: new Date()
        });
    }

    async updateMember(id, data) {
        const updateData = {
            ...data,
            last_updated: new Date()
        };
        return await this.update(id, updateData);
    }

    async searchMembers(query) {
        return await this.findAll({
            fields: [
                'id',
                'user_name',
                'COALESCE(display_name, user_name) AS display_name',
                'avatar'
            ],
            where: {
                'user_name LIKE': `%${query}%`,
                'OR display_name LIKE': `%${query}%`
            }
        });
    }
}

