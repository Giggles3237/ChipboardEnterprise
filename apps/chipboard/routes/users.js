const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireAdmin } = require('../middleware/auth');
const { oldPool } = require('../db');
const bcrypt = require('bcrypt');

const PROFILE_FIELDS = [
  'name',
  'email',
  'organization',
  'ethos_training_complete',
  'bmw_training_complete'
];
const CREATE_FIELDS = [...PROFILE_FIELDS, 'password', 'role', 'status'];
const VALID_ROLES = ['Admin', 'Manager', 'Salesperson'];
const VALID_STATUSES = ['active', 'inactive'];

const hasOnlyFields = (body, allowedFields) =>
  Object.keys(body || {}).every(field => allowedFields.includes(field));

const getOrganizationId = async (organization) => {
  const [orgs] = await oldPool.query('SELECT id FROM organizations WHERE name = ?', [organization]);
  if (orgs.length > 0) {
    return orgs[0].id;
  }

  const [result] = await oldPool.query('INSERT INTO organizations (name) VALUES (?)', [organization]);
  return result.insertId;
};

// Add debugging middleware
router.use((req, res, next) => {
  console.log('Users route hit:', req.method, req.path);
  next();
});

// Clean up the change password route
router.put('/change-password', authenticate, async (req, res) => {
  try {
    if (!hasOnlyFields(req.body, ['currentPassword', 'newPassword'])) {
      return res.status(400).json({ message: 'Password change contains unsupported fields' });
    }

    const userId = req.auth.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    // Get user's current password hash
    const [users] = await oldPool.query('SELECT password FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await oldPool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    // Log the full error server-side but don't send it to client
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'An error occurred while changing password' });
  }
});

// Get all users (admin only)
router.get('/', authenticate, checkPermission(['view_users']), async (req, res) => {
  try {
    console.log('Fetching users...');
    console.log('Auth user:', req.auth);
    
    // First check if tables exist
    const [tables] = await oldPool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('users', 'roles', 'organizations')
    `);
    
    console.log('Available tables:', tables);

    // Check if we can access the roles table
    const [rolesCheck] = await oldPool.query('SELECT * FROM roles LIMIT 1');
    console.log('Roles check:', rolesCheck);

    // Check if we can access the organizations table
    const [orgsCheck] = await oldPool.query('SELECT * FROM organizations LIMIT 1');
    console.log('Organizations check:', orgsCheck);

    // Now try the full query with better error handling
    const [results] = await oldPool.query(`
      SELECT u.*, 
             r.name as role_name,
             o.name as organization_name,
             u.ethos_training_complete,
             u.bmw_training_complete
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
    `);
    
    console.log('Users fetched:', results?.length || 0);
    
    const usersWithoutPasswords = results.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  } catch (err) {
    console.error('Detailed database error:', {
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
      stack: err.stack
    });
    
    return res.status(500).json({ 
      message: 'Error fetching users',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get active salespeople
router.get('/salespeople', authenticate, async (req, res) => {
  try {
    const [results] = await oldPool.query(`
      SELECT u.id, u.name, u.email 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Salesperson'
      AND u.status = 'active'
      ORDER BY u.name ASC
    `);

    console.log('Salespeople query results:', results);
    res.json(results);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      message: 'Error fetching salespeople',
      error: err.message 
    });
  }
});

// Update non-privileged user profile fields (admin only)
router.put('/:id/profile', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body || {};

    if (!hasOnlyFields(updates, PROFILE_FIELDS)) {
      return res.status(400).json({ message: 'Profile update contains unsupported fields' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'At least one profile field is required' });
    }

    const updateData = {};
    if (Object.prototype.hasOwnProperty.call(updates, 'name')) updateData.name = updates.name;
    if (Object.prototype.hasOwnProperty.call(updates, 'email')) updateData.email = updates.email;
    if (Object.prototype.hasOwnProperty.call(updates, 'ethos_training_complete')) {
      if (typeof updates.ethos_training_complete !== 'boolean') {
        return res.status(400).json({ message: 'Ethos training status must be a boolean' });
      }
      updateData.ethos_training_complete = Boolean(updates.ethos_training_complete);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'bmw_training_complete')) {
      if (typeof updates.bmw_training_complete !== 'boolean') {
        return res.status(400).json({ message: 'BMW training status must be a boolean' });
      }
      updateData.bmw_training_complete = Boolean(updates.bmw_training_complete);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'organization')) {
      if (!updates.organization || typeof updates.organization !== 'string') {
        return res.status(400).json({ message: 'Organization is required' });
      }
      updateData.organization_id = await getOrganizationId(updates.organization.trim());
    }

    const [result] = await oldPool.query(
      'UPDATE users SET ? WHERE id = ?',
      [updateData, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  }
});

// Reset another user's password (admin only)
router.put('/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!hasOnlyFields(req.body, ['newPassword'])) {
      return res.status(400).json({ message: 'Password reset contains unsupported fields' });
    }

    const { newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await oldPool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User password reset successfully' });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ message: 'Error resetting user password' });
  }
});

// Change another user's role (admin only)
router.put('/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!hasOnlyFields(req.body, ['role'])) {
      return res.status(400).json({ message: 'Role update contains unsupported fields' });
    }

    const { role } = req.body || {};
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const [roles] = await oldPool.query('SELECT id FROM roles WHERE name = ?', [role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const [result] = await oldPool.query('UPDATE users SET role_id = ? WHERE id = ?', [roles[0].id, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Change another user's status (admin only)
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!hasOnlyFields(req.body, ['status'])) {
      return res.status(400).json({ message: 'Status update contains unsupported fields' });
    }

    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status specified' });
    }

    const [result] = await oldPool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // First check if user exists
    const [users] = await oldPool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate an invalid password hash that can't be used to login
    const invalidPasswordHash = await bcrypt.hash('DEACTIVATED_' + Date.now(), 10);

    // Instead of setting password to NULL, use the invalid hash
    const [result] = await oldPool.query(`
      UPDATE users 
      SET status = 'inactive', 
          email = CONCAT(email, '_inactive_', DATE_FORMAT(NOW(), '%Y%m%d')),
          password = ?
      WHERE id = ?
    `, [invalidPasswordHash, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'User deactivated successfully. Historical sales records have been preserved.' 
    });
  } catch (error) {
    console.error('Error deactivating user:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    res.status(500).json({ 
      message: 'Error deactivating user',
      details: error.sqlMessage || error.message 
    });
  }
});

// Add new user (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!hasOnlyFields(req.body, CREATE_FIELDS)) {
      return res.status(400).json({ message: 'User creation contains unsupported fields' });
    }

    const { name, email, password, role, organization, status } = req.body;

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof organization !== 'string' || !organization.trim() ||
      typeof password !== 'string' || password.length < 8
    ) {
      return res.status(400).json({ message: 'Name, email, organization, and a password of at least 8 characters are required' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (
      (Object.prototype.hasOwnProperty.call(req.body, 'ethos_training_complete') && typeof req.body.ethos_training_complete !== 'boolean') ||
      (Object.prototype.hasOwnProperty.call(req.body, 'bmw_training_complete') && typeof req.body.bmw_training_complete !== 'boolean')
    ) {
      return res.status(400).json({ message: 'Training statuses must be booleans' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get role_id from roles table
    const [roles] = await oldPool.query('SELECT id FROM roles WHERE name = ?', [role]);
    if (roles.length === 0) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const roleId = roles[0].id;

    const organizationId = await getOrganizationId(organization.trim());

    // Insert new user
    const [result] = await oldPool.query(`
      INSERT INTO users (name, email, password, role_id, organization_id, status, ethos_training_complete, bmw_training_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      email,
      hashedPassword,
      roleId,
      organizationId,
      status,
      req.body.ethos_training_complete || false,
      req.body.bmw_training_complete || false
    ]);

    res.status(201).json({ 
      message: 'User created successfully',
      userId: result.insertId 
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ 
      message: 'Error creating user',
      error: err.message 
    });
  }
});

// Get salespeople and managers
router.get('/salespeople-and-managers', authenticate, async (req, res) => {
  try {
    const [users] = await oldPool.query(`
      SELECT u.id, u.name, r.name as role 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('Salesperson', 'Manager') 
      AND u.status = 'active'
      ORDER BY u.name ASC
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching salespeople and managers:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

module.exports = router;
