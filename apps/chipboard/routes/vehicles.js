const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const db = require('../db'); // or wherever you export your MySQL connection

// Configure multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint to handle CSV upload and upsert into Vehicles_Data
router.post('/upload-vehicles', upload.single('vehiclesCsv'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Path of the uploaded CSV
  const csvFilePath = path.join(__dirname, '..', req.file.path);

  const results = [];

  // Read and parse CSV
  fs.createReadStream(csvFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      // Clean / transform properties if needed. For example:
      // row.Stock_Number = row.Stock_Number ? row.Stock_Number.trim() : '';
      // row.VIN = row.VIN.toUpperCase();

      // Collect the row data in an array matching the DB columns (except ID, which auto-increments)
      // Provide any default transformations or parsing (e.g., parseInt for Age, Odometer, etc.)
      results.push([
        row.Stock_Number || '',
        row.VIN || '',
        row.Vehicle || '',
        row.Body || '',
        row.Color || '',
        row.Interior || '',
        parseInt(row.Odometer) || 0,
        parseInt(row.Age) || 0,
        parseInt(row.Days_In_Step) || 0,
        parseInt(row.Days_In_Recon) || 0,
        row.Key_Status || '',
        row.System_Location || '',
        row.User_Checkout || '',
        row.Checkout_Time ? new Date(row.Checkout_Time) : null,
        row.Activity_Type || '',
        row.Notes || '',
        row.Starred_Equip || '',
        row.Tags || '',
        parseInt(row.vRank) || 0,
        row.Certified && row.Certified.toLowerCase() === 'true' ? 1 : 0,
        parseInt(row.Price_Rank) || 0,
        parseFloat(row.Current_Price) || 0.0
      ]);
    })
    .on('end', async () => {
      // Construct the bulk upsert query for Vehicles_Data
      const sql = `
        INSERT INTO Vehicles_Data (
          Stock_Number, VIN, Vehicle, Body, Color, Interior,
          Odometer, Age, Days_In_Step, Days_In_Recon, Key_Status,
          System_Location, User_Checkout, Checkout_Time, Activity_Type,
          Notes, Starred_Equip, Tags, vRank, Certified, Price_Rank,
          Current_Price
        )
        VALUES ?
        ON DUPLICATE KEY UPDATE
          Stock_Number = VALUES(Stock_Number),
          Vehicle = VALUES(Vehicle),
          Body = VALUES(Body),
          Color = VALUES(Color),
          Interior = VALUES(Interior),
          Odometer = VALUES(Odometer),
          Age = VALUES(Age),
          Days_In_Step = VALUES(Days_In_Step),
          Days_In_Recon = VALUES(Days_In_Recon),
          Key_Status = VALUES(Key_Status),
          System_Location = VALUES(System_Location),
          User_Checkout = VALUES(User_Checkout),
          Checkout_Time = VALUES(Checkout_Time),
          Activity_Type = VALUES(Activity_Type),
          Notes = VALUES(Notes),
          Starred_Equip = VALUES(Starred_Equip),
          Tags = VALUES(Tags),
          vRank = VALUES(vRank),
          Certified = VALUES(Certified),
          Price_Rank = VALUES(Price_Rank),
          Current_Price = VALUES(Current_Price)
      `;

      try {
        const [result] = await db.query(sql, [results]);
        // Cleanup uploaded temp file
        fs.unlinkSync(csvFilePath);

        return res.json({
          message: 'Vehicles data upserted successfully.',
          rowsAffected: result.affectedRows
        });
      } catch (error) {
        console.error('Error inserting/updating vehicles data:', error);
        return res.status(500).json({ message: error.message });
      }
    })
    .on('error', (error) => {
      console.error('Error reading CSV:', error);
      return res.status(500).json({ message: error.message });
    });
});

module.exports = router;
