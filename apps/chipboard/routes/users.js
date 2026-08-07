const express = require('express');
const router = express.Router();
const { authenticate, checkPermission, requireAdmin } = require('../middleware/auth');
const { oldPool } = require('../db');
const bcrypt = require('bcrypt');
const { CompositeIdentityEventPublisher, MysqlIdentityAuditLogger, MysqlIdentityEventOutboxPublisher } = require('../services/identityEvents');
const { MysqlUsersRepository } = require('../services/usersRepository');
const { UsersService } = require('../services/usersService');

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

const usersService = new UsersService({
  repository: new MysqlUsersRepository(oldPool, bcrypt),
  bcrypt,
  events: new CompositeIdentityEventPublisher([
    new MysqlIdentityEventOutboxPublisher(oldPool)
  ]),
  audit: new MysqlIdentityAuditLogger(oldPool)
});

const getTenantContext = (req) => ({
  organizationId: req.auth?.organizationId,
  actorUserId: req.auth?.userId,
  role: req.auth?.role
});

const handleUserError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};
// Add debugging middleware
router.use((req, res, next) => {
  console.log('Users route hit:', req.method, req.path);
  next();
});

// Clean up the change password route
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const updated = await usersService.changeOwnPassword(getTenantContext(req), req.body);
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 401) {
      return res.status(error.statusCode).json({ message: error.message });
    }

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
    const user = await usersService.updateProfile(getTenantContext(req), req.params.id, req.body || {});
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User profile updated successfully' });
  } catch (error) {
    handleUserError(res, error, 'Error updating user profile');
  }
});

// Reset another user's password (admin only)
router.put('/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await usersService.resetPassword(getTenantContext(req), req.params.id, req.body || {});
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User password reset successfully' });
  } catch (error) {
    handleUserError(res, error, 'Error resetting user password');
  }
});

// Change another user's role (admin only)
router.put('/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await usersService.updateRole(getTenantContext(req), req.params.id, req.body || {});
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    handleUserError(res, error, 'Error updating user role');
  }
});

// Change another user's status (admin only)
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await usersService.updateStatus(getTenantContext(req), req.params.id, req.body || {});
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    handleUserError(res, error, 'Error updating user status');
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await usersService.deactivate(getTenantContext(req), req.params.id);
    if (!user) {
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
    res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Error deactivating user',
      details: error.sqlMessage || error.message
    });
  }
});

// Add new user (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await usersService.create(getTenantContext(req), req.body || {});

    res.status(201).json({
      message: 'User created successfully',
      userId: user.id
    });
  } catch (error) {
    handleUserError(res, error, 'Error creating user');
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




