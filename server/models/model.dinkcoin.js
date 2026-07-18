import { BaseModel } from "./BaseModel.js";

export class Dinkcoin extends BaseModel {
    constructor() {
        super("dinkcoin_transactions");
    }

    async getBalances() {
        const query = `
            SELECT
                b.user_id,
                CAST(b.balance AS CHAR) AS balance,
                m.user_name,
                COALESCE(m.display_name, m.user_name) AS display_name,
                m.avatar
            FROM dinkcoin_balances b
            LEFT JOIN members m ON m.id = b.user_id
            ORDER BY b.balance DESC, b.user_id ASC
        `;
        return await this.db.query(query);
    }

    async getTransactions(limit = 100) {
        const query = `
            SELECT
                t.id,
                t.from_user_id,
                t.to_user_id,
                CAST(t.amount AS CHAR) AS amount,
                t.tx_type,
                t.tx_hash,
                t.created_at,
                mf.user_name AS from_user_name,
                COALESCE(mf.display_name, mf.user_name) AS from_display_name,
                mf.avatar AS from_avatar,
                mt.user_name AS to_user_name,
                COALESCE(mt.display_name, mt.user_name) AS to_display_name,
                mt.avatar AS to_avatar
            FROM dinkcoin_transactions t
            LEFT JOIN members mf ON mf.id = t.from_user_id
            LEFT JOIN members mt ON mt.id = t.to_user_id
            ORDER BY t.created_at DESC, t.id DESC
            LIMIT ?
        `;
        return await this.db.query(query, [limit]);
    }
}
