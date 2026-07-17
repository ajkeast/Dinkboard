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

}

