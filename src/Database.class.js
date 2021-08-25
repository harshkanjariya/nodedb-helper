const QueryBuilder = require("./QueryBuilder.class");
const mysql = require("mysql");

class Database {
	constructor(databases,debug) {
		let host, username,password;

		this.database = {};
		this.databaseNames = [];
		this.debug = debug;

		Object.keys(databases).forEach(k=>{
			this.databaseNames.push(k);
			let obj = databases[k];

			let db_config = {
				host: obj.host,
				user: obj.username,
				password: obj.password,
				database: obj.name,
			};
			this.database[k] = mysql.createPool(db_config);
			this.database[k].connect((err)=>{
				if (err)throw err;
				console.log(databases[k].name+" Connected successfully")
			});
			this.database[k].on('error',(err)=>{
				// if(err.code === 'PROTOCOL_CONNECTION_LOST')
				// 	this.database[k] = mysql.createConnection(db_config);
				// else
				throw err;
			});
		})

		this.current = 'emplicheck_esign';
	}
	beginTransaction(){
		return this.database[this.current].beginTransaction();
	}
	commit(){
		return this.database[this.current].commit();
	}
	rollback(){
		return this.database[this.current].rollback();
	}
	query(sql,params){
		let q = new QueryBuilder(this.database[this.current],this.debug);
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
		let query = new QueryBuilder(this.database[this.current],this.debug);
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
		let query = new QueryBuilder(this.database[this.current],this.debug);
		let sql = query.selectJoinQuery(object);
		return query.execWithWhereOrderPage(sql,object);
	}
	/**
	 * @param {string} table
	 * @param {{}|[{}]} values
	 * @returns {Promise<{result: unknown, error: *}>}
	 */
	insert(table,values) {
		let query = new QueryBuilder(this.database[this.current],this.debug);
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
		let query = new QueryBuilder(this.database[this.current],this.debug);
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
		let query = new QueryBuilder(this.database[this.current],this.debug);

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
		let query = new QueryBuilder(this.database[this.current],this.debug);
		let sql = query.deleteQuery(object);
		sql = query.whereSql(object,sql);
		return query.execQuery(sql,object.params);
	}
}

module.exports = Database;
