const PROFILE_FIELDS = [
  'name',
  'email',
  'organization',
  'ethos_training_complete',
  'bmw_training_complete'
];
const CREATE_FIELDS = [...PROFILE_FIELDS, 'password', 'role', 'status'];
const VALID_ROLES = ['Owner', 'Admin', 'Manager', 'Salesperson'];
const VALID_STATUSES = ['active', 'inactive'];

const hasOnlyFields = (body, allowedFields) =>
  Object.keys(body || {}).every(field => allowedFields.includes(field));

class UsersService {
  constructor({ repository, bcrypt, events, audit }) {
    this.repository = repository;
    this.bcrypt = bcrypt;
    this.events = events;
    this.audit = audit;
  }

  async changeOwnPassword(context, body) {
    this.assertOnlyFields(body, ['currentPassword', 'newPassword'], 'Password change contains unsupported fields');
    const { currentPassword, newPassword } = body || {};
    if (!currentPassword || !newPassword) {
      this.badRequest('Current password and new password are required');
    }
    this.assertPassword(newPassword);

    const user = await this.repository.findOwnPassword(context.actorUserId);
    if (!user) return null;

    const validPassword = await this.bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    const hashedPassword = await this.bcrypt.hash(newPassword, 10);
    const updated = await this.repository.changeOwnPassword(context.actorUserId, hashedPassword);
    if (!updated) return null;

    await this.publish(context, 'user.password.changed', { userId: context.actorUserId });
    await this.recordAudit(context, 'update', context.actorUserId, undefined, { password: '[changed]' });
    return true;
  }

  async updateProfile(context, userId, updates) {
    this.assertOnlyFields(updates, PROFILE_FIELDS, 'Profile update contains unsupported fields');
    this.assertTenantContext(context);
    if (Object.keys(updates || {}).length === 0) {
      this.badRequest('At least one profile field is required');
    }

    const updateData = {};
    if (Object.prototype.hasOwnProperty.call(updates, 'name')) updateData.name = updates.name;
    if (Object.prototype.hasOwnProperty.call(updates, 'email')) updateData.email = updates.email;
    if (Object.prototype.hasOwnProperty.call(updates, 'ethos_training_complete')) {
      this.assertBoolean(updates.ethos_training_complete, 'Ethos training status must be a boolean');
      updateData.ethos_training_complete = Boolean(updates.ethos_training_complete);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'bmw_training_complete')) {
      this.assertBoolean(updates.bmw_training_complete, 'BMW training status must be a boolean');
      updateData.bmw_training_complete = Boolean(updates.bmw_training_complete);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'organization')) {
      if (!updates.organization || typeof updates.organization !== 'string') {
        this.badRequest('Organization is required');
      }
      updateData.organization_id = await this.repository.getOrganizationId(updates.organization.trim());
      if (String(updateData.organization_id) !== String(context.organizationId)) {
        this.forbidden('Cannot move users outside the authenticated organization');
      }
    }

    const result = await this.repository.updateProfile(context, userId, updateData);
    if (!result) return null;

    await this.publish(context, 'user.profile.updated', { user: result.user, previousUser: result.previousUser });
    await this.recordAudit(context, 'update', userId, result.previousUser, result.user);
    return result.user;
  }

  async resetPassword(context, userId, body) {
    this.assertOnlyFields(body, ['newPassword'], 'Password reset contains unsupported fields');
    this.assertTenantContext(context);
    const { newPassword } = body || {};
    this.assertPassword(newPassword);

    const hashedPassword = await this.bcrypt.hash(newPassword, 10);
    const result = await this.repository.resetPassword(context, userId, hashedPassword);
    if (!result) return null;

    await this.publish(context, 'user.password.reset', { userId });
    await this.recordAudit(context, 'update', userId, undefined, { password: '[reset]' });
    return result.user;
  }

  async updateRole(context, userId, body) {
    this.assertOnlyFields(body, ['role'], 'Role update contains unsupported fields');
    this.assertTenantContext(context);
    const { role } = body || {};
    if (!VALID_ROLES.includes(role)) this.badRequest('Invalid role specified');

    const result = await this.repository.updateRole(context, userId, role);
    if (!result) return null;

    await this.publish(context, 'user.role.updated', { user: result.user, previousUser: result.previousUser });
    await this.recordAudit(context, 'update', userId, result.previousUser, result.user);
    return result.user;
  }

  async updateStatus(context, userId, body) {
    this.assertOnlyFields(body, ['status'], 'Status update contains unsupported fields');
    this.assertTenantContext(context);
    const { status } = body || {};
    if (!VALID_STATUSES.includes(status)) this.badRequest('Invalid status specified');

    const result = await this.repository.updateStatus(context, userId, status);
    if (!result) return null;

    await this.publish(context, 'user.status.updated', { user: result.user, previousUser: result.previousUser });
    await this.recordAudit(context, 'update', userId, result.previousUser, result.user);
    return result.user;
  }

  async deactivate(context, userId) {
    this.assertTenantContext(context);
    const invalidPasswordHash = await this.bcrypt.hash('DEACTIVATED_' + Date.now(), 10);
    const result = await this.repository.deactivate(context, userId, invalidPasswordHash);
    if (!result) return null;

    await this.publish(context, 'user.deactivated', { user: result.user, previousUser: result.previousUser });
    await this.recordAudit(context, 'delete', userId, result.previousUser, result.user);
    return result.user;
  }

  async create(context, body) {
    this.assertOnlyFields(body, CREATE_FIELDS, 'User creation contains unsupported fields');
    this.assertTenantContext(context);

    const { name, email, password, role, organization, status } = body || {};
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof organization !== 'string' || !organization.trim() ||
      typeof password !== 'string' || password.length < 8
    ) {
      this.badRequest('Name, email, organization, and a password of at least 8 characters are required');
    }
    if (!VALID_STATUSES.includes(status)) this.badRequest('Invalid status');
    if (!VALID_ROLES.includes(role)) this.badRequest('Invalid role');
    if (
      (Object.prototype.hasOwnProperty.call(body, 'ethos_training_complete') && typeof body.ethos_training_complete !== 'boolean') ||
      (Object.prototype.hasOwnProperty.call(body, 'bmw_training_complete') && typeof body.bmw_training_complete !== 'boolean')
    ) {
      this.badRequest('Training statuses must be booleans');
    }

    const user = await this.repository.create(context, {
      ...body,
      hashedPassword: await this.bcrypt.hash(password, 10)
    });

    await this.publish(context, 'user.created', { user });
    await this.recordAudit(context, 'create', user.id, undefined, user);
    return user;
  }

  assertTenantContext(context) {
    if (!context.organizationId) {
      this.forbidden('Organization access required');
    }
  }

  assertOnlyFields(body, allowedFields, message) {
    if (!hasOnlyFields(body, allowedFields)) this.badRequest(message);
  }

  assertBoolean(value, message) {
    if (typeof value !== 'boolean') this.badRequest(message);
  }

  assertPassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
      this.badRequest('New password must be at least 8 characters long');
    }
  }

  badRequest(message) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  forbidden(message) {
    const error = new Error(message);
    error.statusCode = 403;
    throw error;
  }

  async publish(context, type, payload) {
    await this.events?.publish({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      organizationId: context.organizationId,
      type,
      payload,
      actorUserId: context.actorUserId,
      occurredAt: new Date().toISOString(),
      correlationId: context.correlationId
    });
  }

  async recordAudit(context, action, entityId, previousValue, newValue) {
    await this.audit?.record({
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
      action,
      entityType: 'user',
      entityId,
      previousValue,
      newValue
    });
  }
}

module.exports = {
  CREATE_FIELDS,
  PROFILE_FIELDS,
  VALID_ROLES,
  VALID_STATUSES,
  UsersService,
  hasOnlyFields
};


