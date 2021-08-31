const db = require('./index')({
	test: {
		host: 'localhost',
		username: 'root',
		password: '',
		name: 'test',
	}
});

async function getData() {
	let connection = await db.beginTransaction();
	let result = await db.insert('names',{
		name: 'Abc',
	},connection);
	console.log("test.js>16",result);
	result = await db.select({
		table: 'names',
		connection,
	});
	console.log("test.js>16",result);
	await db.rollback(connection);
}
getData();