const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    console.log('Auth middleware hit');
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header found');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Authenticated user:', {
      userId: decoded.userId,
      role: decoded.role,
      name: decoded.name
    });
    req.auth = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const checkPermission = (permissions) => {
  return (req, res, next) => {
    const userRole = req.auth.role;
    
    // Admin has all permissions
    if (userRole === 'Admin') {
      return next();
    }

    // Check specific permissions based on role
    const hasPermission = permissions.some(permission => {
      switch (permission) {
        case 'add_sales':
          return ['Manager', 'Salesperson'].includes(userRole);
        case 'edit_sales':
          return ['Manager', 'Salesperson'].includes(userRole);
        case 'delete_sales':
          return ['Manager'].includes(userRole);
        case 'view_users':
          return ['Manager'].includes(userRole);
        case 'edit_users':
        case 'delete_users':
          return false;
        default:
          return false;
      }
    });

    if (!hasPermission) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

module.exports = { authenticate, checkPermission, requireAdmin };
