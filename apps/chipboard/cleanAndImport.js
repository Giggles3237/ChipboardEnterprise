require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2');

// Connect to MySQL
const mysqlDb = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

mysqlDb.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

// Array to hold cleaned data
const results = [];

// Read and clean the CSV data
fs.createReadStream('C:/Users/chris/OneDrive - PandW Foreign Cars/1 - Projects/Chip Board/ChipsMySQL/Chips/ChipUpload-raw1.6.csv')
  .pipe(csv())
  .on('data', (data) => {
    // Trim whitespace
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === 'string') {
        data[key] = data[key].trim();
      }
    });

    // Validate and format 'year'
    data.year = parseInt(data.year) || null;

    // Convert 'delivered' to BOOLEAN
    data.delivered = data.delivered.toLowerCase() === 'true' ? 1 : 0;

    // Validate and format 'deliveryDate'
    if (data.deliveryDate) {
      const date = new Date(data.deliveryDate);
      if (!isNaN(date)) {
        data.deliveryDate = date.toISOString().split('T')[0];
      } else {
        data.deliveryDate = null;
      }
    } else {
      data.deliveryDate = null;
    }

    // Push cleaned data as an array
    results.push([
      data.clientName,
      data.stockNumber,
      data.year,
      data.make,
      data.model,
      data.color,
      data.advisor,
      data.delivered,
      data.deliveryDate,
      data.type,
    ]);
  })
  .on('end', () => {
    // Bulk Insert into MySQL
    const insertQuery = `
      INSERT INTO sales (clientName, stockNumber, year, make, model, color, advisor, delivered, deliveryDate, type)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        clientName = VALUES(clientName),
        year = VALUES(year),
        make = VALUES(make),
        model = VALUES(model),
        color = VALUES(color),
        advisor = VALUES(advisor),
        delivered = VALUES(delivered),
        deliveryDate = VALUES(deliveryDate),
        type = VALUES(type);
    `;

    mysqlDb.query(insertQuery, [results], (err, res) => {
      if (err) {
        console.error('Error inserting data:', err);
      } else {
        console.log(`Inserted/Updated ${res.affectedRows} rows`);
      }
      mysqlDb.end();
    });
  });


