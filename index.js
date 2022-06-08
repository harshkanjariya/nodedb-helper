const Database = require("./src/Database.class");

function setupDatabase(dbObject,debug=false) {
	let databaseList = dbObject;

	let database = new Database(databaseList,debug);
	database.current = Object.keys(dbObject)[0];

	function query(sql,params,connection=null) {
		return database.query(sql,params,connection);
	}
	/**
	 * @param {string} table
	 * @param {{}|[{}]} values
	 * @param connection
	 * @returns {Promise<{result: unknown, error: *}>}
	 */
	function insert(table,values,connection=null) {
		return database.insert(table,values, connection);
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
	function update(object) {
		return database.update(object);
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
	function select(object) {
		return database.select(object);
	}
	/**
	 * @param {{table:string,
	 * where:string,
	 * params: string|Array
	 * }} object
	 * @return {Promise}
	 */
	function deleteQuery(object) {
		return database.deleteQuery(object);
	}
	/**
	 * @param {{
     * 	   joins: [string],
	 *     table: [string],
	 *	   columns: string, where: string, params: []}} object
	 * @return {Promise<unknown>}
	 */
	function selectJoin(object) {
		return database.selectJoin(object);
	}
	/**
	 * @param {{table:string,
	 * values: {},
	 * ignore: [string]
	 * }} object
	 * @returns {Promise}
	 */
	function insertOrUpdate(object) {
		return database.insertOrUpdate(object);
	}

	let fns = {
		query,
		select,
		insert,
		update,
		delete: deleteQuery,
		selectJoin,
		insertOrUpdate,
		beginTransaction: ()=>database.beginTransaction(),
		commit: (connection)=>database.commit(connection),
		rollback: (connection)=>database.rollback(connection),
		close: () => database.close(),
	}
	let obj = {...fns};
	Object.keys(databaseList).forEach(k=>{
		obj[k] = ()=>{
			database.current = k;
			return fns;
		}
	});
	return obj;
}

module.exports = setupDatabase;
