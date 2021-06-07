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

let fns = {
	query,
	select,
	insert,
	update,
	delete: deleteQuery,
	selectJoin,
	insertOrUpdate,
	beginTransaction: ()=>database.beginTransaction(),
	commit: ()=>database.commit(),
	rollback: ()=>database.rollback(),
}
let obj = {...fns};
Object.keys(databaseList).forEach(k=>{
	obj[k] = ()=>{
		database.current = k;
		return fns;
	}
});

module.exports = obj;