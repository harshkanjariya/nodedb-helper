const QueryBuilder = require("./QueryBuilder.class");
const mysql = require("mysql2");

class Database {
	constructor(databases, debug) {
		let host, username, password;

		this.database = {};
		this.databaseNames = [];
		this.debug = debug;

		Object.keys(databases).forEach(k => {
			this.databaseNames.push(k);
			let obj = databases[k];

			let db_config = {
				host: obj.host,
				user: obj.username,
				password: obj.password,
				database: obj.name,
				port: obj.port || 3306,
				multipleStatements: true
			};
			this.database[k] = mysql.createPool(db_config);
			let q = new QueryBuilder(this.database[k], this.debug);
			q.execQuery('show tables')
				.then(r=>{
					if (r.result){
						console.log(databases[k].name + " Connected successfully")
					}else if (r.error.code === 'ER_BAD_DB_ERROR'){
						throw new Error('Database not found => '+obj.name);
					}else{
						console.log("Database.class.js>32",r.error);
					}
				})
		})
		this.current = null;
	}
	close() {
		Object.keys(this.database).forEach(key => {
			this.database[key].end();
		});
	}

	beginTransaction() {
		return new Promise((resolve, reject) => {
			this.database[this.current].getConnection((err, connection) => {
				connection.beginTransaction((err) => {
					if (err) {                  //Transaction Error (Rollback and release connection)
						connection.rollback(function () {
							connection.release();
							reject(err);
						});
					} else {
						resolve(connection);
					}
				});
			});
		});
	}

	commit(connection) {
		return new Promise((resolve, reject) => {
			connection.commit((err) => {
				if (err) {
					connection.rollback(function () {
						connection.release();
						reject(err);
					});
				} else {
					connection.release();
					resolve();
				}
			});
		});
	}

	rollback(connection) {
		connection.rollback(function () {
			connection.release();
		});
	}

	query(sql, params, connection = null) {
		let q = new QueryBuilder(this.database[this.current], this.debug);
		return q.execQuery(sql, params, connection);
	}

	/**
	 * @param {{
	 *     table: string,
	 *     columns: string|Array,
	 *     where: string,
	 *     params: string|Array,
	 *     order: string|Array,
	 *     limit: number,
	 *     offset: number,
	 * }} object
	 * @return {Promise<unknown>}
	 */
	select(object) {
		let query = new QueryBuilder(this.database[this.current], this.debug);
		let sql = query.selectQuery(object);
		return query.execWithWhereOrderPage(sql, object);
	}

	/**
	 * @param {{
	 * 	   joins: [string],
	 *     table: [string],
	 *	   columns: string, where: string, params: []}} object
	 * @return {Promise<unknown>}
	 */
	selectJoin(object) {
		let query = new QueryBuilder(this.database[this.current], this.debug);
		let sql = query.selectJoinQuery(object);
		return query.execWithWhereOrderPage(sql, object);
	}

	/**
	 * @param {string} table
	 * @param {{}|[{}]} values
	 * @param connection
	 * @returns {Promise<{result: unknown, error: *}>}
	 */
	insert(table, values, connection = null) {
		let query = new QueryBuilder(this.database[this.current], this.debug);
		let obj;
		if (Array.isArray(values))
			obj = query.insertMultipleQuery(table, values);
		else
			obj = query.insertQuery(table, values);
		return query.execQuery(obj.sql, obj.params, connection);
	}

	/**
	 * @param {{table:string,
	 * values:{},
	 * where: string,
	 * params: Array|string,
	 * ignore: Array|string
	 * }} object
	 * @return Promise
	 */
	update(object) {
		let query = new QueryBuilder(this.database[this.current], this.debug);
		let sql = query.updateQuery(object);
		sql = query.whereSql(object, sql);
		return query.execQuery(sql, object.params, object.connection);
	}

	/**
	 * @param {{table:string,
	 * values: {},
	 * ignore: [string]
	 * }} object
	 * @returns {Promise}
	 */
	insertOrUpdate(object) {
		let query = new QueryBuilder(this.database[this.current], this.debug);

		let obj;
		if (Array.isArray(object.values))
			obj = query.insertMultipleQuery(object.table, object.values);
		else
			obj = query.insertQuery(object.table, object.values);
		let {sql, params} = obj;
		sql += ' on duplicate key update ';
		sql = query.setValuesWithIgnoreSql(object, sql);

		return query.execQuery(sql, params, object.connection);
	}

	/**
	 * @param {{table:string,
	 * where:string,
	 * params: string|Array
	 * }} object
	 * @return {Promise}
	 */
	deleteQuery(object) {
		let query = new QueryBuilder(this.database[this.current], this.debug);
		let sql = query.deleteQuery(object);
		sql = query.whereSql(object, sql);
		return query.execQuery(sql, object.params, object.connection);
	}
}

module.exports = Database;
