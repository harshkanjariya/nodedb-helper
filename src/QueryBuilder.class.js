const fs = require('fs');

class QueryBuilder {
	constructor(dbConnection, debug) {
		this.db = dbConnection;
		this.debug = debug;
		this.connection = null;
	}

	execWithWhereOrderPage(sql, object) {
		sql = this.whereSql(object, sql);
		sql = this.orderSql(object, sql);
		sql = this.page(object, sql);

		return this.execQuery(sql, object.params, object.connection);
	}

	execWithConnection(sql, params, connection, resolve, release) {
		let sqlObj = {};
		if (this.debug) {
			sqlObj['sql'] = connection.format(sql, params);
		}
		connection.query(sql, params, (err, result) => {
			if (release)
				connection.release();
			if (err) {
				if (this.debug) {
					fs.appendFile('db-error.log', err.stack + '\n', () => {
					});
				}
				resolve({
					result: null,
					error: err,
					...sqlObj
				});
			} else {
				resolve({
					result: result,
					error: null,
					...sqlObj
				});
			}
		})
	}

	execQuery(sql, params, connection = null) {
		if (params && typeof params === "string")
			params = [params];

		return new Promise((resolve) => {
			if (connection) {
				this.execWithConnection(sql, params, connection, resolve, false);
			} else {
				this.db.getConnection((err, connection) => {
					if (err) {
						resolve({
							result: null,
							error: err,
						});
					} else {
						this.execWithConnection(sql, params, connection, resolve, true);
					}
				});
			}
		});
	}

	selectQuery(object) {
		let sql = 'select ';
		sql = this.columnsSql(object, sql);
		sql += ` from ${object.table} `;
		return sql;
	}

	selectJoinQuery(object) {
		let sql = 'select ';
		sql = this.columnsSql(object, sql);
		sql += ` from ${object.tables[0]} `;

		if (typeof object.joins === 'string')
			object.joins = [object.joins];
		for (let i = 1; i < object.tables.length; i++) {
			sql += ` left join ${object.tables[i]} on ${object.joins[i - 1]}`;
		}
		return sql;
	}

	insertQuery(table, values) {
		let keys = Object.keys(values);
		let sql = `insert into ${table}(${keys.join(',')})
                   values (`;

		let vals = [];
		for (let i = 0; i < keys.length; i++) {
			if (i !== 0)
				sql += ',';
			sql += '?';
			vals.push(values[keys[i]]);
		}
		sql += ')';
		return {sql, params: vals};
	}

	insertMultipleQuery(table, values) {
		if (values.length < 1) return '';
		let keys = Object.keys(values[0]);
		let sql = `insert into ${table} (${keys.join(',')})
                   values ? `;
		values = values.map(v => {
			return keys.map(k => v[k])
		})
		return {sql, params: [values]}
	}

	updateQuery(object) {
		if (typeof object.params === "string")
			object.params = [object.params];

		let sql = `update ${object.table}
                   set ?`;
		object.params = [object.values, ...object.params];
		return sql;
	}

	deleteQuery(object) {
		return `delete
                from ${object.table}`;
	}

	setValuesWithIgnoreSql(object, sql) {
		if (object.ignore && typeof object.ignore === "string")
			object.ignore = [object.ignore];

		let keys;
		if (Array.isArray(object.values))
			keys = Object.keys(object.values[0])
		else
			keys = Object.keys(object.values);

		let filteredKeys = [];
		if (object.ignore !== true)
			keys.forEach(k => {
				if (object.ignore && object.ignore.includes(k)) return;
				filteredKeys.push(k);
			})
		if (filteredKeys.length === 0 && !object.duplicateUpdate)
			return sql;

		let addable = [];
		filteredKeys.forEach((k) => {
			if ((object.ignore && object.ignore.includes(k)) ||
				(object.duplicateIgnore && object.duplicateIgnore.includes(k))) return;

			addable.push(k + `=values(${k})`);
		});

		if (object.duplicateUpdate) {
			let keys = Object.keys(object.duplicateUpdate);
			keys.forEach((k) => {
				addable.push(k + `='${object.duplicateUpdate[k]}'`);
			});
		}
		sql += addable.join(',');

		return sql;
	}

	columnsSql(object, sql) {
		if (!object.columns) {
			sql += '*';
		} else {
			if (typeof object.columns === 'string') {
				sql += object.columns;
			} else {
				sql += object.columns.join(',');
			}
		}
		return sql;
	}

	whereSql(object, sql) {
		if (object.where && object.where.trim() !== '') {
			return sql + ' where ' + object.where;
		}
		return sql;
	}

	orderSql(object, sql) {
		if (object.order) {
			let order = object.order;
			if (typeof order === 'string') {
				sql += ` order by ${order}`;
			} else if (order.length > 0) {
				sql += ` order by ${order.join(',')}`;
			}
		}
		return sql;
	}

	page(object, sql) {
		if (object.pageSize) {
			sql += ` limit ${object.pageSize}`;
		}
		if (object.pageNumber) {
			sql += ` offset ${object.pageNumber * object.pageSize}`;
		}
		return sql;
	}
}

module.exports = QueryBuilder;