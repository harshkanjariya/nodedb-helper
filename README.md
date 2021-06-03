# nodedb-helper

## mysql helper

This package helps optimize mysql connection for re-use.
You can manage multiple databases using this package easily.

#### setup

set .env variables for production and development
```dotenv
NODE_ENV=development

PROD_DB_URL=mysql_url
PROD_DB_USERNAME=mysql_admin
PROD_DB_PASSWORD=abcdefgh

DEV_DB_URL=localhost
DEV_DB_USERNAME=root
DEV_DB_PASSWORD=
```

setup database.js for re-use
```javascript
const db = require('nodedb-helper')({
	user: 'my_user_db',
	product: 'my_product_db'
})

module.exports = db;
```

use in  product.js
```javascript
const db = require('./database.js');

let result = await db.product().select({
	table: 'product_details',
	where: 'product_id=?',
	params: [123]
});
```
