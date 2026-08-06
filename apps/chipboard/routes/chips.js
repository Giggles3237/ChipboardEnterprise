const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../db');

router.get('/', authenticate, async (req, res) => {
  const { startDate, endDate, searchTerm, searchArchive } = req.query;
  
  try {
    let query = `
      SELECT 
        i.StockNumber,
        i.Year,
        i.Make,
        i.Model,
        v.Color,
        c.Status as ChipStatus,
        c.UpdatedAt
      FROM indexfiletable i
      LEFT JOIN vautoexporttable v ON i.StockNumber = v.StockNumber
      LEFT JOIN chiptable c ON i.StockNumber = c.StockNumber
      WHERE 1=1
    `;

    const params = [];

    if (startDate && endDate) {
      query += ` AND c.UpdatedAt BETWEEN ? AND ?`;
      params.push(new Date(startDate), new Date(endDate));
    }

    if (searchTerm) {
      query += ` AND (
        i.StockNumber LIKE ? OR
        i.Make LIKE ? OR
        i.Model LIKE ? OR
        v.Color LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (!searchArchive) {
      query += ` AND c.Status != 'Archived'`;
    }

    query += ` ORDER BY c.UpdatedAt DESC`;

    const [chips] = await db.query(query, params);

    res.json(chips);
  } catch (error) {
    console.error('Error fetching chips:', error);
    res.status(500).json({ 
      message: 'Error fetching chips', 
      error: error.message 
    });
  }
});

module.exports = router; 