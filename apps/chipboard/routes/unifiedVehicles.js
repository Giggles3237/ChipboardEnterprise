// unifiedVehicles.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { newPool } = require('../db');

// Endpoint: Get unified vehicles with minimal fields
router.get('/', authenticate, async (req, res) => {
  try {
    const { searchTerm, searchType = 'general', limit = 25, page = 1 } = req.query;

    // Return an empty result if the search term is too short
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.json({
        vehicles: [],
        pagination: { total: 0, page: 1, limit: 25, totalPages: 0 }
      });
    }

    const parsedLimit = parseInt(limit, 10) || 25;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;
    const startTime = Date.now();
    const trimmedSearch = searchTerm.trim();

    let vehicles = [];
    let totalCount = 0;

    if (searchType === 'stock') {
      // For stock searches, we assume an exact match (remove whitespace and uppercase the term)
      const stockNumber = trimmedSearch.replace(/\s+/g, '').toUpperCase();
      const query = `
        SELECT u.\`Stock #\` AS StockNumber,
               u.\`Year\`,
               u.\`Make\`,
               u.\`Model\`,
               u.\`Color\`,
               l.Price AS \`Current Price\`
        FROM unifiedvehicledata u
        LEFT JOIN latest_vehicle_summary l ON u.\`Stock #\` = l.StockNumber
        WHERE u.\`Stock #\` = ?
        LIMIT 1
      `;
      const [result] = await newPool.query(query, [stockNumber]);
      totalCount = result.length;
      vehicles = result;
    } else {
      // For a general search, use wildcard matching on Make, Model, Color, and StockNumber
      const searchWildcard = `%${trimmedSearch}%`;

      // Run a count query for pagination info
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM latest_vehicle_summary
        WHERE Make LIKE ?
           OR Model LIKE ?
           OR Color LIKE ?
           OR StockNumber LIKE ?
      `;
      const [countResult] = await newPool.query(countQuery, [
        searchWildcard,
        searchWildcard,
        searchWildcard,
        searchWildcard
      ]);
      totalCount = countResult[0]?.total || 0;

      // Run the paginated query
      const query = `
        SELECT
          StockNumber,
          Year,
          Make,
          Model,
          Color,
          Price AS \`Current Price\`
        FROM latest_vehicle_summary
        WHERE Make LIKE ?
           OR Model LIKE ?
           OR Color LIKE ?
           OR StockNumber LIKE ?
        ORDER BY StockNumber
        LIMIT ? OFFSET ?
      `;
      const [results] = await newPool.query(query, [
        searchWildcard,
        searchWildcard,
        searchWildcard,
        searchWildcard,
        parsedLimit,
        offset
      ]);
      vehicles = results;
    }

    const duration = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / parsedLimit);

    return res.json({
      vehicles,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages
      },
      performance: {
        duration,
        warning: duration > 1000
          ? 'Search performance was slow. Consider refining your search terms or adding proper indexes.'
          : null
      }
    });
  } catch (error) {
    console.error('Search error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      searchTerm: req.query.searchTerm,
      searchType: req.query.searchType || 'general'
    });
    return res.status(500).json({
      message: 'Error fetching vehicles',
      error: error.message
    });
  }
});

// Endpoint: Get detailed information for a specific vehicle
router.get('/details/:stockNumber', authenticate, async (req, res) => {
  const { stockNumber } = req.params;
  try {
    // Get vehicle details from the latest_vehicle_summary view
    const [vehicleResult] = await newPool.query(
      `
      SELECT *
      FROM latest_vehicle_summary
      WHERE StockNumber = ?
      LIMIT 1
      `,
      [stockNumber]
    );

    if (!vehicleResult || vehicleResult.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Query key records from keyperdata
    const [keyResult1] = await newPool.query(
      `
      SELECT 
        Status as status,
        User as user,
        \`Checkout Local Time\` as checkoutTime,
        location as systemLocation
      FROM keyperdata
      WHERE StockNumber = ?
      ORDER BY my_row_id DESC
      `,
      [stockNumber]
    );

    // Query key records from keyperdata_second_key
    const [keyResult2] = await newPool.query(
      `
      SELECT 
        Status as status,
        User as user,
        \`Checkout Local Time\` as checkoutTime,
        location as systemLocation
      FROM keyperdata_second_key
      WHERE StockNumber = ?
      ORDER BY my_row_id DESC
      `,
      [stockNumber]
    );

    // Merge the results from both key tables
    const combinedKeyResults = [...keyResult1, ...keyResult2];

    // Prepare vehicleDetails, mapping key records to a standard format
    const vehicleDetails = {
      ...vehicleResult[0],
      keyRecords: combinedKeyResults.map(key => ({
        status: key.status || 'Unknown',
        user: key.user || 'N/A',
        systemLocation: key.systemLocation || 'N/A',
        checkoutTime: key.checkoutTime || 'N/A'
      }))
    };

    return res.json(vehicleDetails);
  } catch (error) {
    console.error('Details query error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stockNumber
    });
    return res.status(500).json({
      message: 'Error fetching vehicle details',
      error: error.message
    });
  }
});

module.exports = router;
