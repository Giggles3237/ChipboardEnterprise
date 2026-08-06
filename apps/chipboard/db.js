const mysql = require('mysql2/promise');
require('dotenv').config();

// Create pool for the old database
const oldPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Create pool for the unified vehicle database
const newPool = mysql.createPool({
    host: process.env.NEWDB_HOST,
    user: process.env.NEWDB_USER,
    password: process.env.NEWDB_PASSWORD,
    database: process.env.NEWDB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = {
    oldPool,
    newPool
};
