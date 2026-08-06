const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { newPool } = require('../db');

router.get('/:stockNumber', authenticate, async (req, res) => {
    try {
        const { stockNumber } = req.params;
        
        const query = `
            SELECT 
                KeyStatus as status,
                KeyUser as user,
                KeyLocation as systemLocation,
                CheckoutLocalTime as checkoutTime,
                KeyDescription
            FROM latest_key_data
            WHERE StockNumber = ?
            ORDER BY KeyDescription
        `;
        
        const [keys] = await newPool.query(query, [stockNumber]);
        
        if (keys && keys.length > 0) {
            res.json({
                StockNumber: stockNumber,
                KeyRecords: keys.map(key => ({
                    status: key.status || 'Unknown',
                    user: key.user || 'N/A',
                    systemLocation: key.systemLocation || 'N/A',
                    checkoutTime: key.checkoutTime || 'N/A'
                }))
            });
        } else {
            res.json({
                StockNumber: stockNumber,
                KeyRecords: []
            });
        }
        
    } catch (error) {
        console.error('Error fetching key data:', error);
        res.status(500).json({ 
            message: 'Error fetching key data', 
            error: error.message 
        });
    }
});

module.exports = router; 