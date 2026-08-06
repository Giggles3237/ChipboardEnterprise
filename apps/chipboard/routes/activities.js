const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../db');

// Get activities
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching activities...');
    console.log('User making request:', req.auth);
    
    // First, let's check if there are any activities at all
    const [count] = await db.query('SELECT COUNT(*) as count FROM activities');
    console.log('Total activities in database:', count[0].count);
    
    const [activities] = await db.query(`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email
      FROM activities a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    
    console.log('Activities fetched:', activities.length);
    console.log('Sample activity:', activities[0]);
    
    res.json(activities);
  } catch (err) {
    console.error('Detailed error in activities route:', err);
    console.error('SQL State:', err.sqlState);
    console.error('SQL Message:', err.sqlMessage);
    res.status(500).json({ message: 'Error fetching activities' });
  }
});

// Create activity
router.post('/', authenticate, async (req, res) => {
  try {
    const { action_type, description, related_id, related_type } = req.body;
    const user_id = req.auth.userId;

    const [result] = await db.query(
      `INSERT INTO activities (user_id, action_type, description, related_id, related_type)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, action_type, description, related_id, related_type]
    );

    res.status(201).json({
      id: result.insertId,
      user_id,
      action_type,
      description,
      related_id,
      related_type,
      created_at: new Date()
    });
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ message: 'Error creating activity' });
  }
});

// Add this route after the existing routes
router.get('/debug-auth', authenticate, async (req, res) => {
  res.json({
    auth: req.auth,
    headers: req.headers,
    timestamp: new Date()
  });
});

module.exports = router;
