const Database = require("database/Database.class");

let databaseList = {
	esign: process.env.ESIGN_DB_NAME,
}

let database = new Database(databaseList);
database.current = 'esign';

function query(sql,params) {
	return database.query(sql,params);
}
function insert(table,values) {
	return database.insert(table,values);
}
function update(object) {
	return database.update(object);
}
function select(object) {
	return database.select(object);
}
function deleteQuery(object) {
	return database.deleteQuery(object);
}
function selectJoin(object) {
	return database.selectJoin(object);
}
function insertOrUpdate(object) {
	return database.insertOrUpdate(object);
}
function beginTransaction() {
	return database.beginTransaction();
}
function commit() {
	return database.commit();
}

let fns = {
	query,
	select,
	insert,
	update,
	delete: deleteQuery,
	selectJoin,
	insertOrUpdate,
	beginTransaction,
	commit,
}
let obj = {...fns};
Object.keys(databaseList).forEach(k=>{
	obj[k] = ()=>{
		database.current = k;
		return fns;
	}
});

module.exports = obj;