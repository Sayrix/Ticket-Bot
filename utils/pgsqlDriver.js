/**
 * Official pre-released quick.db Postgresql driver. Remove this file when the driver is officially released ~ zhiyan114
 * Why add this? PostgreSQL is a better database than MySQL. Alternative would be to use Prisma,
 * but I don't want to esentially re-write the database logic and cause confusions.
 * Source: https://github.com/plexidev/quick.db/blob/dev/src/drivers/PostgresDriver.ts
 * LICENSE: https://github.com/plexidev/quick.db/blob/dev/LICENSE.md
 */

const { Client } = require("pg");

module.exports = class PostgresDriver {
	instance;
	config;
	conn;

	constructor(config) {
		this.config = config;
	}

	static createSingleton(config) {
		if (!this.instance) this.instance = new PostgresDriver(config);
		return this.instance;
	}

	async connect() {
		this.conn = new Client(this.config);
		await this.conn.connect();
	}

	async disconnect() {
		this.checkConnection();
		await this.conn.end();
	}

	checkConnection(){
		if (!this.conn) {
			throw new Error("No connection to postgres database");
		}
	}

	async prepare(table) {
		this.checkConnection();
		await this.conn.query(
			`CREATE TABLE IF NOT EXISTS ${table} (id VARCHAR(255), value TEXT)`
		);
	}

	async getAllRows(table) {
		this.checkConnection();
		const queryResult = await this.conn.query(`SELECT * FROM ${table}`);
		return queryResult.rows.map((row) => ({
			id: row.id,
			value: JSON.parse(row.value),
		}));
	}

	async getRowByKey(
		table,
		key
	) {
		this.checkConnection();
		const queryResult = await this.conn.query(
			`SELECT value FROM ${table} WHERE id = $1`,
			[key]
		);

		if (queryResult.rowCount < 1) return [null, false];
		return [JSON.parse(queryResult.rows[0].value), true];
	}

	async setRowByKey(
		table,
		key,
		value,
		update
	) {
		this.checkConnection();

		const stringifiedValue = JSON.stringify(value);

		if (update) {
			await this.conn.query(
				`UPDATE ${table} SET value = $1 WHERE id = $2`,
				[stringifiedValue, key]
			);
		} else {
			await this.conn.query(
				`INSERT INTO ${table} (id, value) VALUES ($1, $2)`,
				[key, stringifiedValue]
			);
		}

		return value;
	}

	async deleteAllRows(table) {
		this.checkConnection();
		const queryResult = await this.conn.query(`DELETE FROM ${table}`);
		return queryResult.rowCount;
	}

	async deleteRowByKey(table, key) {
		this.checkConnection();
		const queryResult = await this.conn.query(
			`DELETE FROM ${table} WHERE id = $1`,
			[key]
		);
		return queryResult.rowCount;
	}
};