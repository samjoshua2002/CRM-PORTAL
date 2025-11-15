const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Journey {
  constructor(journeyData) {
    this.journey_id = journeyData.journey_id || uuidv4();
    this.lead_id = journeyData.lead_id || null;
    this.started_at = journeyData.started_at || new Date();
    this.ended_at = journeyData.ended_at || null;
    this.status = journeyData.status || 'pre_lead';
    this.created_at = journeyData.created_at || new Date();
    this.updated_at = journeyData.updated_at || new Date();
  }

  // Create a new journey
  static async create(journeyData) {
    const journey = new Journey(journeyData);

    const sql = `
      INSERT INTO journeys (
        journey_id, lead_id, started_at, ended_at, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      journey.journey_id,
      journey.lead_id,
      journey.started_at,
      journey.ended_at,
      journey.status,
      journey.created_at,
      journey.updated_at
    ];

    try {
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating journey:', error);
      throw error;
    }
  }

  // Find journey by ID
  static async findById(journeyId) {
    const sql = 'SELECT * FROM journeys WHERE journey_id = $1';
    try {
      const result = await query(sql, [journeyId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding journey by ID:', error);
      throw error;
    }
  }

  // Find journey by lead ID
  static async findByLeadId(leadId) {
    const sql = 'SELECT * FROM journeys WHERE lead_id = $1 ORDER BY created_at DESC';
    try {
      const result = await query(sql, [leadId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding journey by lead ID:', error);
      throw error;
    }
  }

  // Update journey
  static async update(journeyId, updateData) {
    const fields = [];
    const values = [journeyId];
    let paramIndex = 2;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());

    const sql = `
      UPDATE journeys
      SET ${fields.join(', ')}
      WHERE journey_id = $1
      RETURNING *
    `;

    try {
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating journey:', error);
      throw error;
    }
  }

  // Update journey status and link to lead
  static async updateWithLead(journeyId, leadId, status = 'lead_created') {
    const sql = `
      UPDATE journeys
      SET
        lead_id = $2,
        status = $3,
        updated_at = $4
      WHERE journey_id = $1
      RETURNING *
    `;

    const values = [journeyId, leadId, status, new Date()];

    try {
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating journey with lead:', error);
      throw error;
    }
  }

  // Complete journey (mark as converted)
  static async complete(journeyId, status = 'converted') {
    const sql = `
      UPDATE journeys
      SET
        status = $2,
        ended_at = $3,
        updated_at = $3
      WHERE journey_id = $1
      RETURNING *
    `;

    const values = [journeyId, status, new Date()];

    try {
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error completing journey:', error);
      throw error;
    }
  }

  // Get journey statistics
  static async getStats(orgId, filters = {}) {
    let whereClause = 'WHERE j.created_at >= $1 AND j.created_at <= $2';
    const values = [
      filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default 30 days ago
      filters.endDate || new Date()
    ];
    let paramIndex = 3;

    if (filters.orgId) {
      whereClause += ` AND l.org_id = $${paramIndex}`;
      values.push(filters.orgId);
      paramIndex++;
    }

    const sql = `
      SELECT
        j.status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (j.ended_at - j.started_at))/86400) as avg_duration_days
      FROM journeys j
      LEFT JOIN leads l ON j.lead_id = l.lead_id
      ${whereClause}
      GROUP BY j.status
      ORDER BY count DESC
    `;

    try {
      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting journey stats:', error);
      throw error;
    }
  }

  // Get conversion funnel
  static async getFunnel(orgId, filters = {}) {
    let whereClause = 'WHERE l.org_id = $1';
    const values = [orgId];
    let paramIndex = 2;

    if (filters.startDate) {
      whereClause += ` AND l.created_at >= $${paramIndex}`;
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereClause += ` AND l.created_at <= $${paramIndex}`;
      values.push(filters.endDate);
      paramIndex++;
    }

    const sql = `
      SELECT
        j.status,
        COUNT(*) as count,
        COUNT(DISTINCT j.journey_id) as unique_journeys
      FROM journeys j
      INNER JOIN leads l ON j.lead_id = l.lead_id
      ${whereClause}
      GROUP BY j.status
      ORDER BY
        CASE j.status
          WHEN 'pre_lead' THEN 1
          WHEN 'lead_created' THEN 2
          WHEN 'engaged' THEN 3
          WHEN 'mql' THEN 4
          WHEN 'sql' THEN 5
          WHEN 'opportunity' THEN 6
          WHEN 'converted' THEN 7
          ELSE 8
        END
    `;

    try {
      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting funnel data:', error);
      throw error;
    }
  }
}

module.exports = Journey;