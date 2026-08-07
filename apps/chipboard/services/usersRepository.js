class MysqlUsersRepository {
  constructor(pool, bcrypt) {
    this.pool = pool;
    this.bcrypt = bcrypt;
  }

  async getOrganizationId(organization) {
    const [orgs] = await this.pool.query('SELECT id FROM organizations WHERE name = ?', [organization]);
    if (orgs.length > 0) {
      return orgs[0].id;
    }

    const [result] = await this.pool.query('INSERT INTO organizations (name) VALUES (?)', [organization]);
    return result.insertId;
  }

  async findById(context, userId) {
    const [users] = await this.pool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.organization_id = ?`,
      [userId, context.organizationId]
    );

    return users[0] || null;
  }

  async findOwnPassword(userId) {
    const [users] = await this.pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    return users[0] || null;
  }

  async changeOwnPassword(userId, hashedPassword) {
    const [result] = await this.pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    return result.affectedRows > 0;
  }

  async updateProfile(context, userId, updateData) {
    const previousUser = await this.findById(context, userId);
    if (!previousUser) return null;

    const [result] = await this.pool.query(
      'UPDATE users SET ? WHERE id = ? AND organization_id = ?',
      [updateData, userId, context.organizationId]
    );
    if (result.affectedRows === 0) return null;

    return {
      previousUser,
      user: { ...previousUser, ...updateData }
    };
  }

  async resetPassword(context, userId, hashedPassword) {
    const previousUser = await this.findById(context, userId);
    if (!previousUser) return null;

    const [result] = await this.pool.query(
      'UPDATE users SET password = ? WHERE id = ? AND organization_id = ?',
      [hashedPassword, userId, context.organizationId]
    );
    if (result.affectedRows === 0) return null;

    return { previousUser, user: { ...previousUser, password: '[redacted]' } };
  }

  async updateRole(context, userId, role) {
    const previousUser = await this.findById(context, userId);
    if (!previousUser) return null;

    const [roles] = await this.pool.query('SELECT id FROM roles WHERE name = ?', [role]);
    if (roles.length === 0) {
      const error = new Error('Invalid role specified');
      error.statusCode = 400;
      throw error;
    }

    const [result] = await this.pool.query(
      'UPDATE users SET role_id = ? WHERE id = ? AND organization_id = ?',
      [roles[0].id, userId, context.organizationId]
    );
    if (result.affectedRows === 0) return null;

    return { previousUser, user: { ...previousUser, role_id: roles[0].id, role_name: role } };
  }

  async updateStatus(context, userId, status) {
    const previousUser = await this.findById(context, userId);
    if (!previousUser) return null;

    const [result] = await this.pool.query(
      'UPDATE users SET status = ? WHERE id = ? AND organization_id = ?',
      [status, userId, context.organizationId]
    );
    if (result.affectedRows === 0) return null;

    return { previousUser, user: { ...previousUser, status } };
  }

  async deactivate(context, userId, invalidPasswordHash) {
    const previousUser = await this.findById(context, userId);
    if (!previousUser) return null;

    const [result] = await this.pool.query(`
      UPDATE users 
      SET status = 'inactive', 
          email = CONCAT(email, '_inactive_', DATE_FORMAT(NOW(), '%Y%m%d')),
          password = ?
      WHERE id = ? AND organization_id = ?
    `, [invalidPasswordHash, userId, context.organizationId]);

    if (result.affectedRows === 0) return null;

    return {
      previousUser,
      user: { ...previousUser, status: 'inactive', password: '[redacted]' }
    };
  }

  async create(context, input) {
    const [roles] = await this.pool.query('SELECT id FROM roles WHERE name = ?', [input.role]);
    if (roles.length === 0) {
      const error = new Error('Invalid role');
      error.statusCode = 400;
      throw error;
    }

    const roleId = roles[0].id;
    const organizationId = await this.getOrganizationId(input.organization.trim());

    if (String(organizationId) !== String(context.organizationId)) {
      const error = new Error('Cannot create users outside the authenticated organization');
      error.statusCode = 403;
      throw error;
    }

    const [result] = await this.pool.query(`
      INSERT INTO users (name, email, password, role_id, organization_id, status, ethos_training_complete, bmw_training_complete)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      input.name,
      input.email,
      input.hashedPassword,
      roleId,
      organizationId,
      input.status,
      input.ethos_training_complete || false,
      input.bmw_training_complete || false
    ]);

    return {
      id: result.insertId,
      name: input.name,
      email: input.email,
      role_id: roleId,
      role_name: input.role,
      organization_id: organizationId,
      status: input.status,
      ethos_training_complete: input.ethos_training_complete || false,
      bmw_training_complete: input.bmw_training_complete || false
    };
  }
}

module.exports = {
  MysqlUsersRepository
};
