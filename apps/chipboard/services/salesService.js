class SalesService {
  constructor({ repository, events, audit }) {
    this.repository = repository;
    this.events = events;
    this.audit = audit;
  }

  async listSales(context) {
    this.assertTenantContext(context);
    return this.repository.list(context);
  }

  async listPendingSales(context) {
    this.assertTenantContext(context);
    return this.repository.listPending(context);
  }

  async createSale(context, input) {
    this.assertTenantContext(context);
    this.assertCreateInput(input);

    const sale = await this.repository.create(context, input);
    await this.publish(context, 'sale.created', { sale });
    await this.recordAudit(context, 'create', sale.id, undefined, sale);
    return sale;
  }

  async updateSale(context, saleId, input) {
    this.assertTenantContext(context);

    const result = await this.repository.update(context, saleId, input);
    if (!result) {
      return null;
    }

    await this.publish(context, 'sale.updated', {
      sale: result.sale,
      previousSale: result.previousSale
    });
    await this.recordAudit(context, 'update', result.sale.id, result.previousSale, result.sale);
    return result.sale;
  }

  async deleteSale(context, saleId) {
    this.assertTenantContext(context);

    const sale = await this.repository.delete(context, saleId);
    if (!sale) {
      return null;
    }

    await this.publish(context, 'sale.deleted', { sale });
    await this.recordAudit(context, 'delete', sale.id, sale, undefined);
    return sale;
  }

  assertTenantContext(context) {
    if (!context.organizationId) {
      const error = new Error('Organization access required');
      error.statusCode = 403;
      throw error;
    }
  }

  assertCreateInput(input) {
    const required = ['clientName', 'stockNumber', 'year', 'make', 'model'];
    const missing = required.filter(field => !input[field]);

    if (missing.length > 0) {
      const error = new Error('Missing required fields');
      error.statusCode = 400;
      error.details = { required, missing };
      throw error;
    }
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
      entityType: 'sale',
      entityId,
      previousValue,
      newValue
    });
  }
}

module.exports = {
  SalesService
};
