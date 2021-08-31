const db = require('./index')({
	test: {
		host: 'localhost',
		username: 'root',
		password: '',
		name: 'information_schema',
	}
});

async function getData() {
	let result = await db.select({
		table: 'columns',
		where: 'schema=?',
		params: ['emplicheck_user'],
	});
	console.log("test.js>16",result);
}
getData();