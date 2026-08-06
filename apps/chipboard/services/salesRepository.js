const toLegacySale = (row) => row;

class MysqlSalesRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async list(context) {
    await this.pool.query('SELECT 1 as test');
    const [results] = await this.pool.query(
      'SELECT * FROM vehicle_sales WHERE organization_id = ? ORDER BY deliveryDate DESC',
      [context.organizationId]
    );
    return results.map(toLegacySale);
  }

  async listPending(context) {
    const [results] = await this.pool.query(`
      SELECT * FROM vehicle_sales 
      WHERE delivered = 0
      AND organization_id = ?
      ORDER BY deliveryDate ASC
    `, [context.organizationId]);
    return results.map(toLegacySale);
  }

  async create(context, input) {
    const query = `
      INSERT INTO vehicle_sales 
      (clientName, stockNumber, year, make, model, color, advisor, delivered, deliveryDate, type, user_id, organization_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      input.clientName,
      input.stockNumber,
      input.year,
      input.make,
      input.model,
      input.color,
      input.advisor,
      input.delivered ? 1 : 0,
      input.deliveryDate,
      input.type,
      context.actorUserId,
      context.organizationId
    ];

    const [result] = await this.pool.query(query, values);

    return {
      id: result.insertId,
      ...input,
      user_id: context.actorUserId,
      organization_id: context.organizationId
    };
  }

  async findById(context, saleId) {
    const [results] = await this.pool.query(
      'SELECT * FROM vehicle_sales WHERE id = ? AND organization_id = ?',
      [saleId, context.organizationId]
    );

    return results[0] || null;
  }

  async update(context, saleId, input) {
    const previousSale = await this.findById(context, saleId);

    if (!previousSale) {
      return null;
    }

    const { id, user_id, organization_id, ...updateData } = input;
    const [updateResult] = await this.pool.query(
      'UPDATE vehicle_sales SET ? WHERE id = ? AND organization_id = ?',
      [updateData, saleId, context.organizationId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error('Error updating sale');
    }

    const sale = await this.findById(context, saleId);
    return { sale, previousSale };
  }

  async delete(context, saleId) {
    const sale = await this.findById(context, saleId);

    if (!sale) {
      return null;
    }

    const [deleteResult] = await this.pool.query(
      'DELETE FROM vehicle_sales WHERE id = ? AND organization_id = ?',
      [saleId, context.organizationId]
    );

    if (deleteResult.affectedRows === 0) {
      throw new Error('Error deleting sale');
    }

    return sale;
  }
}

module.exports = {
  MysqlSalesRepository
};
