const QueryBuilder = require("./QueryBuilder.class");
const mysql = require("mysql");

class Database {
	constructor(databases) {
		let host, username,password;

		if (process.env.NODE_ENV === 'production'){
			host = process.env.PROD_DB_URL;
			username = process.env.PROD_DB_USERNAME;
			password = process.env.PROD_DB_PASSWORD;
		}else{
			host = process.env.DEV_DB_URL;
			username = process.env.DEV_DB_USERNAME;
			password = process.env.DEV_DB_PASSWORD;
		}
		this.database = {};
		this.databaseNames = [];

		Object.keys(databases).forEach(k=>{
			this.databaseNames.push(k);

			this.database[k] = mysql.createConnection({
				host: host,
				user: username,
				password: password,
				database: databases[k],
			});
			this.database[k].connect(function(err) {
				if (err)throw err;
				console.log(databases[k]+" Connected successfully")
			});
		})

		this.current = 'emplicheck_esign';
	}
	query(sql,params){
		let q = new QueryBuilder(this.database[this.current]);
		return q.execQuery(sql,params);
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
	select(object){
		let query = new QueryBuilder(this.database[this.current]);
		let sql = query.selectQuery(object);
		return query.execWithWhereOrderPage(sql,object);
	}
	/**
	 * @param {{
     * 	   joins: [string], 
	 *     table: [string], 
	 *	   columns: string, where: string, params: []}} object
	 * @return {Promise<unknown>}
	 */
	selectJoin(object){
		let query = new QueryBuilder(this.database[this.current]);
		let sql = query.selectJoinQuery(object);
		return query.execWithWhereOrderPage(sql,object);
	}
	/**
	 * @param {string} table
	 * @param {{}|[{}]} values
	 * @returns {Promise<{result: unknown, error: *}>}
	 */
	insert(table,values) {
		let query = new QueryBuilder(this.database[this.current]);
		let obj;
		if (Array.isArray(values))
			obj = query.insertMultipleQuery(table,values);
		else
			obj = query.insertQuery(table,values);
		return query.execQuery(obj.sql,obj.params);
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
	update(object){
		let query = new QueryBuilder(this.database[this.current]);
		let sql = query.updateQuery(object);
		sql = query.whereSql(object,sql);
		return query.execQuery(sql,object.params);
	}
	/**
	 * @param {{table:string,
	 * values: {},
	 * ignore: [string]
	 * }} object
	 * @returns {Promise}
	 */
	insertOrUpdate(object) {
		let query = new QueryBuilder(this.database[this.current]);

		let obj;
		if (Array.isArray(object.values))
			obj = query.insertMultipleQuery(object.table,object.values);
		else
			obj = query.insertQuery(object.table,object.values);
		let {sql,params} = obj;
		sql += ' on duplicate key update ';
		sql = query.setValuesWithIgnoreSql(object,sql);

		return query.execQuery(sql,params);
	}
	/**
	 * @param {{table:string,
	 * where:string,
	 * params: string|Array
	 * }} object
	 * @return {Promise}
	 */
	deleteQuery(object) {
		let query = new QueryBuilder(this.database[this.current]);
		let sql = query.deleteQuery(object);
		sql = query.whereSql(object,sql);
		return query.execQuery(sql,object.params);
	}
}

module.exports = Database;