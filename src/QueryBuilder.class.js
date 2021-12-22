const fs = require('fs');

class QueryBuilder {
	constructor(dbConnection, debug) {
		this.db = dbConnection;
		this.debug = debug;
		this.connection = null;
	}

	static tableAlias(table_name, query) {
		return `(${query}) ${table_name}`;
	}

	static selectQuery(object) {
		if (!object.table && !object.tables)
			throw new Error('"table" or "tables" is required field');
		if (object.tables) {
			if (object.tables.length < 2)
				throw new Error('"tables" require minimum two tables');
			if (!object.joins)
				throw new Error('"joins" field is required');
			if (object.tables.length - 1 !== object.joins.length)
				throw new Error("tables and joins count doesn't match");
		}
		if (typeof object.joins === 'string') {
			object.joins = [object.joins];
		}

		let query = 'select ';
		query += QueryBuilder.columns(object);
		query += ' from ';
		if (object.table)
			query += QueryBuilder.table(object.table);
		else {
			query += QueryBuilder.table(object.tables[0]);
			for (let i = 1; i < object.tables.length; i++) {
				let table = QueryBuilder.table(object.tables[i]);
				query += ` left join ${table} on ${object.joins[i - 1]}`;
			}
		}
		query += QueryBuilder.where(object);
		query += QueryBuilder.ordering(object);
		query += QueryBuilder.paging(object);
		query = QueryBuilder.replace_params(query, object.params);
		return query;
	}
	static table(object){
		let s;
		if (typeof object === "string") {
			s = object;
		} else {
			let keys = Object.keys(object);
			if (keys.length > 1) {
				throw new Error('only one property allowed in table object');
			}
			let key = keys[0];
			let original = object[key].trim();
			if (original)
			s = `(${original}) as ${key}`;
		}
		return s;
	}
	static replace_params(query, params) {
		let q = query;
		params.forEach(o => {
			let s = o;
			if (typeof o !== "number")
				s = `'${o}'`;
			q = q.replace('?', s);
		});
		return q;
	}

	static ordering(object) {
		if (object.order) {
			let order = object.order;
			if (typeof order === 'string') {
				return ` order by ${order}`;
			} else if (order.length > 0) {
				return ` order by ${order.join(',')}`;
			}
			return '';
		}
		return '';
	}

	static paging(object) {
		let s = '';
		if (object.pageSize)
			s += ` limit ${object.pageSize}`;
		if (object.pageNumber)
			s += ` offset ${object.pageNumber * object.pageSize}`;
		return s;
	}

	static where(object) {
		if (object.where && object.where.trim() !== '') {
			return ' where ' + object.where;
		}
		return '';
	}

	static columns(object) {
		if (!object.columns) {
			return '*';
		}
		if (typeof object.columns === "string")
			return object.columns;
		if (Array.isArray(object.columns))
			return object.columns.join(',');
		throw new Error('Invalid value for field "columns"');
	}

	execWithWhereOrderPage(sql, object) {
		sql = this.whereSql(object, sql);
		sql = this.orderSql(object, sql);
		sql = this.page(object, sql);

		return this.execQuery(sql, object.params, object.connection);
	}

	execWithConnection(options) {
		let {sql, params, stack, connection, resolve, release} = options;
		let sqlObj = {};
		if (this.debug) {
			sqlObj['sql'] = connection.format(sql, params);
		}
		connection.query(sql, params, (err, result) => {
			if (release)
				connection.release();
			if (err) {
				if (this.debug) {
					fs.appendFile('db-error.log', stack + "==>" + err + '\n', () => {
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

		let stack = new Error().stack;
		return new Promise((resolve) => {
			if (connection) {
				this.execWithConnection({
					stack,
					sql, params,
					connection, resolve, release: false
				});
			} else {
				this.db.getConnection((err, connection) => {
					if (err) {
						resolve({
							result: null,
							error: err,
						});
					} else {
						this.execWithConnection({
							stack,
							sql, params,
							connection, resolve, release: true
						});
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