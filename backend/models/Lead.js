const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Lead {
  constructor(leadData) {
    this.lead_id = leadData.lead_id || uuidv4();
    this.org_id = leadData.org_id;
    this.first_name = leadData.first_name;
    this.last_name = leadData.last_name;
    this.email = leadData.email;
    this.email_normalized = leadData.email ? leadData.email.toLowerCase().trim() : null;
    this.phone = leadData.phone;
    this.phone_e164 = leadData.phone_e164;
    this.company = leadData.company;
    this.website = leadData.website;
    this.country_code = leadData.country_code;
    this.country_name = leadData.country_name;
    this.state = leadData.state;
    this.city = leadData.city;
    this.source_raw = leadData.source_raw;
    this.source_channel = leadData.source_channel;
    this.utm_source = leadData.utm_source;
    this.utm_medium = leadData.utm_medium;
    this.utm_campaign = leadData.utm_campaign;
    this.utm_term = leadData.utm_term;
    this.utm_content = leadData.utm_content;
    this.first_touch_id = leadData.first_touch_id;
    this.last_touch_id = leadData.last_touch_id;
    this.journey_id = leadData.journey_id;
    this.stage = leadData.stage || 'new';
    this.status = leadData.status || 'open';
    this.program_interest = leadData.program_interest;
    this.consent_marketing = leadData.consent_marketing || false;
    this.consent_sales = leadData.consent_sales || false;
    // Lead scoring fields
    this.academic_score = leadData.academic_score || 0;
    this.experience_score = leadData.experience_score || 0;
    this.program_fit_score = leadData.program_fit_score || 0;
    this.engagement_score = leadData.engagement_score || 0;
    this.geography_score = leadData.geography_score || 0;
    this.data_quality_score = leadData.data_quality_score || 0;
    this.lead_score = leadData.lead_score || 0;
    this.hotness_snapshot = leadData.hotness_snapshot || 'cold';
    this.last_scored_at = leadData.last_scored_at || null;
    // Assignment fields
    this.assigned_counselor = leadData.assigned_counselor || null;
    this.assignment_date = leadData.assignment_date || null;
    this.assignment_rule = leadData.assignment_rule || null;
    this.followup_status = leadData.followup_status || 'pending';
    // Other fields with defaults
    this.lifecycle_score = leadData.lifecycle_score || 0;
    this.intent_score = leadData.intent_score || 0;
    this.grade = leadData.grade || null;
    this.created_at = leadData.created_at || new Date();
    this.updated_at = leadData.updated_at || new Date();
  }

  // Create a new lead
  static async create(leadData) {
    const lead = new Lead(leadData);

    const sql = `
      INSERT INTO leads (
        lead_id, org_id, first_name, last_name, email, email_normalized, phone, phone_e164,
        company, website, country_code, country_name, state, city, source_raw, source_channel,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, first_touch_id,
        last_touch_id, journey_id, stage, status, program_interest, consent_marketing, consent_sales,
        academic_score, experience_score, program_fit_score, engagement_score, geography_score,
        data_quality_score, lead_score, hotness_snapshot, last_scored_at, assigned_counselor,
        assignment_date, assignment_rule, followup_status, lifecycle_score, intent_score, grade,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49
      )
      RETURNING *
    `;

    const values = [
      lead.lead_id, lead.org_id, lead.first_name, lead.last_name, lead.email, lead.email_normalized,
      lead.phone, lead.phone_e164, lead.company, lead.website, lead.country_code, lead.country_name,
      lead.state, lead.city, lead.source_raw, lead.source_channel, lead.utm_source, lead.utm_medium,
      lead.utm_campaign, lead.utm_term, lead.utm_content, lead.first_touch_id, lead.last_touch_id,
      lead.journey_id, lead.stage, lead.status, lead.program_interest, lead.consent_marketing,
      lead.consent_sales, lead.academic_score, lead.experience_score, lead.program_fit_score,
      lead.engagement_score, lead.geography_score, lead.data_quality_score, lead.lead_score,
      lead.hotness_snapshot, lead.last_scored_at, lead.assigned_counselor, lead.assignment_date,
      lead.assignment_rule, lead.followup_status, lead.lifecycle_score, lead.intent_score, lead.grade,
      lead.created_at, lead.updated_at
    ];

    try {
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  // Find lead by ID
  static async findById(leadId) {
    const sql = 'SELECT * FROM leads WHERE lead_id = $1';
    try {
      const result = await query(sql, [leadId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding lead by ID:', error);
      throw error;
    }
  }

  // Find lead by email
  static async findByEmail(email) {
    const emailNormalized = email.toLowerCase().trim();
    const sql = 'SELECT * FROM leads WHERE email_normalized = $1';
    try {
      const result = await query(sql, [emailNormalized]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding lead by email:', error);
      throw error;
    }
  }

  // Get all leads for an organization (with pagination)
  static async findAll(orgId, page = 1, limit = 50, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE org_id = $1';
    const values = [orgId];
    let paramIndex = 2;

    // Add filters
    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.stage) {
      whereClause += ` AND stage = $${paramIndex}`;
      values.push(filters.stage);
      paramIndex++;
    }

    if (filters.assigned_counselor) {
      whereClause += ` AND assigned_counselor = $${paramIndex}`;
      values.push(filters.assigned_counselor);
      paramIndex++;
    }

    if (filters.hotness) {
      whereClause += ` AND hotness_snapshot = $${paramIndex}`;
      values.push(filters.hotness);
      paramIndex++;
    }

    const sql = `
      SELECT * FROM leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    try {
      const result = await query(sql, values);

      // Get total count for pagination
      const countSql = `SELECT COUNT(*) FROM leads ${whereClause}`;
      const countValues = values.slice(0, -2); // Remove limit and offset
      const countResult = await query(countSql, countValues);

      return {
        leads: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      };
    } catch (error) {
      console.error('Error finding all leads:', error);
      throw error;
    }
  }

  // Update lead
  static async update(leadId, updateData) {
    const fields = [];
    const values = [leadId];
    let paramIndex = 2;

    // Build dynamic update query
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

    // Always update the updated_at timestamp
    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());

    const sql = `
      UPDATE leads
      SET ${fields.join(', ')}
      WHERE lead_id = $1
      RETURNING *
    `;

    try {
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  // Update lead scores
  static async updateScores(leadId, scores) {
    const sql = `
      UPDATE leads
      SET
        academic_score = $2,
        experience_score = $3,
        program_fit_score = $4,
        engagement_score = $5,
        geography_score = $6,
        data_quality_score = $7,
        lead_score = $8,
        hotness_snapshot = $9,
        last_scored_at = $10,
        updated_at = $11
      WHERE lead_id = $1
      RETURNING *
    `;

    const values = [
      leadId,
      scores.academic_score || 0,
      scores.experience_score || 0,
      scores.program_fit_score || 0,
      scores.engagement_score || 0,
      scores.geography_score || 0,
      scores.data_quality_score || 0,
      scores.lead_score || 0,
      scores.hotness_snapshot || 'cold',
      new Date(),
      new Date()
    ];

    try {
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating lead scores:', error);
      throw error;
    }
  }

  // Assign lead to counselor
  static async assign(leadId, counselorId, teamId, ruleId, ruleSnapshot) {
    const updateSql = `
      UPDATE leads
      SET
        assigned_counselor = $2,
        owner_user_id = $2,
        assignment_date = $3,
        assignment_rule = $4,
        followup_status = 'pending',
        updated_at = $3
      WHERE lead_id = $1
      RETURNING *
    `;

    const logSql = `
      INSERT INTO assignment_logs (
        lead_id, assigned_counselor, team_id, rule_id, rule_snapshot, assigned_at, followup_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const timestamp = new Date();

    try {
      const result = await query(updateSql, [leadId, counselorId, timestamp, ruleSnapshot]);

      await query(logSql, [
        leadId,
        counselorId,
        teamId,
        ruleId,
        JSON.stringify(ruleSnapshot),
        timestamp,
        'pending'
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error assigning lead:', error);
      throw error;
    }
  }

  // Get leads by counselor
  static async findByCounselor(counselorId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT * FROM leads
      WHERE assigned_counselor = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await query(sql, [counselorId, limit, offset]);

      const countSql = 'SELECT COUNT(*) FROM leads WHERE assigned_counselor = $1';
      const countResult = await query(countSql, [counselorId]);

      return {
        leads: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      };
    } catch (error) {
      console.error('Error finding leads by counselor:', error);
      throw error;
    }
  }
}

module.exports = Lead;