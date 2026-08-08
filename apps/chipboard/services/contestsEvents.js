class CompositeContestsEventPublisher {
  constructor(publishers) {
    this.publishers = publishers;
  }

  async publish(event) {
    const results = await Promise.allSettled(
      this.publishers.map(publisher => publisher.publish(event))
    );

    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
}

class MysqlContestsEventOutboxPublisher {
  constructor(pool) {
    this.pool = pool;
    this.ready = null;
  }

  async publish(event) {
    await this.ensureTable();
    await this.pool.query(
      `INSERT INTO event_outbox
        (id, organization_id, store_id, type, payload, status, attempts, actor_user_id, correlation_id, occurred_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      [
        event.id,
        event.organizationId,
        event.storeId || null,
        event.type,
        JSON.stringify(event.payload),
        event.actorUserId || null,
        event.correlationId || null,
        event.occurredAt
      ]
    );
  }

  ensureTable() {
    if (!this.ready) {
      this.ready = this.pool.query(`
        CREATE TABLE IF NOT EXISTS event_outbox (
          id VARCHAR(80) PRIMARY KEY,
          organization_id INT NOT NULL,
          store_id INT NULL,
          type VARCHAR(120) NOT NULL,
          payload JSON NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'pending',
          attempts INT NOT NULL DEFAULT 0,
          actor_user_id INT NULL,
          correlation_id VARCHAR(80) NULL,
          occurred_at DATETIME NOT NULL,
          processed_at DATETIME NULL,
          last_error TEXT NULL,
          INDEX idx_event_outbox_status_occurred (status, occurred_at),
          INDEX idx_event_outbox_organization_occurred (organization_id, occurred_at)
        )
      `);
    }

    return this.ready;
  }
}

class MysqlContestsAuditLogger {
  constructor(pool) {
    this.pool = pool;
    this.ready = null;
  }

  async record(entry) {
    await this.ensureTable();
    await this.pool.query(
      `INSERT INTO audit_logs
        (organization_id, actor_user_id, action, entity_type, entity_id, previous_value, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        entry.organizationId,
        entry.actorUserId || null,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.previousValue === undefined ? null : JSON.stringify(entry.previousValue),
        entry.newValue === undefined ? null : JSON.stringify(entry.newValue)
      ]
    );
  }

  ensureTable() {
    if (!this.ready) {
      this.ready = this.pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          actor_user_id INT NULL,
          action VARCHAR(40) NOT NULL,
          entity_type VARCHAR(120) NOT NULL,
          entity_id VARCHAR(80) NULL,
          previous_value JSON NULL,
          new_value JSON NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_audit_logs_organization_created (organization_id, created_at)
        )
      `);
    }

    return this.ready;
  }
}

module.exports = {
  CompositeContestsEventPublisher,
  MysqlContestsAuditLogger,
  MysqlContestsEventOutboxPublisher
};
