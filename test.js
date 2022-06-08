const QueryBuilder = require("./src/QueryBuilder.class");
const db = require('./index')({
	test: {
		host: 'localhost',
		username: 'root',
		password: '',
		name: 'test',
	}
});

async function getData() {
	let result = await db.query('show tables');
	console.log("test.js>13",result);
	await new Promise(resolve => {
		setTimeout(resolve, 2000);
	});
	db.close();
	// let result = await db.insert('names',{
	// 	name: 'Abc',
	// });
	// console.log("test.js>16",result);
	// result = await db.select({
	// 	table: 'names'
	// });
	let qb = QueryBuilder;
	// let tables = {
	// 	test,
	// 	t: qb.selectQuery({
	// 		table: 'test2',
	// 		where: 'id=?',
	// 		params: [6]
	// 	})
	// };
	// let tables = [
	// 	'test',
	// 	{
	// 		t: qb.selectQuery({
	// 			table: 'test2',
	// 			where: 'id=?',
	// 			params: [6]
	// 		})
	// 	}
	// ];
	// console.log("test.js>23", qb.selectQuery({
	// 	tables: [
	// 		{t: 'test'},
	// 		{
	// 			tbl: qb.selectQuery({
	// 				table: 'test2',
	// 				where: 'id=?',
	// 				params: [6]
	// 			})
	// 		},
	// 		'test3'
	// 	],
	// 	joins: [
	// 		'test.id=t.id',
	// 		'test3.name=t.name'
	// 	],
	// 	columns: [
	// 		'pelli',
	// 		'biji'
	// 	],
	// 	where: 'id=? or name=?',
	// 	params: [1, 'harsh'],
	// 	pageSize: 10,
	// 	pageNumber: 2,
	// 	order: [
	// 		'name',
	// 		'id'
	// 	]
	// }));
}

getData();
