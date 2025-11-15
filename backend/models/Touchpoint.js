const { query } = require('../config/database');

class Touchpoint {
  constructor(touchpointData) {
    this.journey_id = touchpointData.journey_id;
    this.lead_id = touchpointData.lead_id;
    this.occurred_at = touchpointData.occurred_at || new Date();
    this.event_type = touchpointData.event_type;
    this.channel = touchpointData.channel;
    this.source = touchpointData.source;
    this.medium = touchpointData.medium;
    this.campaign = touchpointData.campaign;
    this.adgroup = touchpointData.adgroup;
    this.keyword = touchpointData.keyword;
    this.landing_url = touchpointData.landing_url;
    this.page_url = touchpointData.page_url;
    this.referrer_url = touchpointData.referrer_url;
    this.utm_source = touchpointData.utm_source;
    this.utm_medium = touchpointData.utm_medium;
    this.utm_campaign = touchpointData.utm_campaign;
    this.utm_term = touchpointData.utm_term;
    this.utm_content = touchpointData.utm_content;
    this.attribution_model = touchpointData.attribution_model;
    this.weight = touchpointData.weight;
    this.is_bot = touchpointData.is_bot || false;
    this.is_test = touchpointData.is_test || false;
    this.ingest_source = touchpointData.ingest_source;
    this.event_id = touchpointData.event_id;
    this.created_at = touchpointData.created_at || new Date();
    this.updated_at = touchpointData.updated_at || new Date();
  }

  // Create a new touchpoint
  static async create(touchpointData) {
    const touchpoint = new Touchpoint(touchpointData);

    const sql = `
      INSERT INTO touchpoints (
        journey_id, lead_id, occurred_at, event_type, channel, source, medium, campaign,
        adgroup, keyword, landing_url, page_url, referrer_url, utm_source, utm_medium,
        utm_campaign, utm_term, utm_content, attribution_model, weight, is_bot, is_test,
        ingest_source, event_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      RETURNING *
    `;

    const values = [
      touchpoint.journey_id,
      touchpoint.lead_id,
      touchpoint.occurred_at,
      touchpoint.event_type,
      touchpoint.channel,
      touchpoint.source,
      touchpoint.medium,
      touchpoint.campaign,
      touchpoint.adgroup,
      touchpoint.keyword,
      touchpoint.landing_url,
      touchpoint.page_url,
      touchpoint.referrer_url,
      touchpoint.utm_source,
      touchpoint.utm_medium,
      touchpoint.utm_campaign,
      touchpoint.utm_term,
      touchpoint.utm_content,
      touchpoint.attribution_model,
      touchpoint.weight,
      touchpoint.is_bot,
      touchpoint.is_test,
      touchpoint.ingest_source,
      touchpoint.event_id,
      touchpoint.created_at,
      touchpoint.updated_at
    ];

    try {
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating touchpoint:', error);
      throw error;
    }
  }

  // Find touchpoint by ID
  static async findById(touchpointId) {
    const sql = 'SELECT * FROM touchpoints WHERE touchpoint_id = $1';
    try {
      const result = await query(sql, [touchpointId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding touchpoint by ID:', error);
      throw error;
    }
  }

  // Get touchpoints for a journey
  static async findByJourneyId(journeyId, limit = 100) {
    const sql = `
      SELECT * FROM touchpoints
      WHERE journey_id = $1
      ORDER BY occurred_at ASC
      LIMIT $2
    `;
    try {
      const result = await query(sql, [journeyId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error finding touchpoints by journey ID:', error);
      throw error;
    }
  }

  // Get touchpoints for a lead
  static async findByLeadId(leadId, limit = 100) {
    const sql = `
      SELECT * FROM touchpoints
      WHERE lead_id = $1
      ORDER BY occurred_at ASC
      LIMIT $2
    `;
    try {
      const result = await query(sql, [leadId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error finding touchpoints by lead ID:', error);
      throw error;
    }
  }

  // Create initial touchpoint (for anonymous visitors)
  static async createInitialTouchpoint(utmParams, sessionData) {
    const touchpointData = {
      journey_id: sessionData.journeyId,
      lead_id: sessionData.leadId || null,
      event_type: 'page_view',
      channel: utmParams.utm_channel || 'organic',
      source: utmParams.utm_source,
      medium: utmParams.utm_medium,
      campaign: utmParams.utm_campaign,
      keyword: utmParams.utm_term,
      content: utmParams.utm_content,
      page_url: sessionData.pageUrl,
      referrer_url: sessionData.referrerUrl,
      landing_url: sessionData.landingUrl,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
      attribution_model: 'first_touch',
      weight: 1.0,
      is_bot: sessionData.isBot || false,
      is_test: sessionData.isTest || false,
      ingest_source: 'web',
      event_id: sessionData.eventId
    };

    return await Touchpoint.create(touchpointData);
  }

  // Create form submission touchpoint
  static async createFormSubmission(leadId, journeyId, formData, utmParams) {
    const touchpointData = {
      journey_id: journeyId,
      lead_id: leadId,
      event_type: 'form_submit',
      channel: utmParams.utm_channel || 'organic',
      source: utmParams.utm_source,
      medium: utmParams.utm_medium,
      campaign: utmParams.utm_campaign,
      keyword: utmParams.utm_term,
      content: utmParams.utm_content,
      page_url: formData.pageUrl,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
      attribution_model: 'last_click',
      weight: 1.0,
      ingest_source: 'web'
    };

    return await Touchpoint.create(touchpointData);
  }

  // Update touchpoint with lead information
  static async updateWithLead(touchpointId, leadId, journeyId) {
    const sql = `
      UPDATE touchpoints
      SET
        lead_id = $2,
        journey_id = $3,
        updated_at = $4
      WHERE touchpoint_id = $1
      RETURNING *
    `;

    const values = [touchpointId, leadId, journeyId, new Date()];

    try {
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating touchpoint with lead:', error);
      throw error;
    }
  }

  // Get attribution data for a lead
  static async getAttribution(leadId, model = 'first_click') {
    let orderBy;
    switch (model) {
      case 'last_click':
        orderBy = 'ORDER BY t.occurred_at DESC LIMIT 1';
        break;
      case 'first_click':
        orderBy = 'ORDER BY t.occurred_at ASC LIMIT 1';
        break;
      case 'linear':
        orderBy = 'ORDER BY t.occurred_at ASC';
        break;
      default:
        orderBy = 'ORDER BY t.occurred_at DESC LIMIT 1';
    }

    const sql = `
      SELECT *
      FROM touchpoints t
      WHERE t.lead_id = $1
      AND t.occurred_at IS NOT NULL
      AND NOT t.is_bot
      AND NOT t.is_test
      ${orderBy}
    `;

    try {
      const result = await query(sql, [leadId]);
      if (model === 'linear') {
        return result.rows;
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting attribution data:', error);
      throw error;
    }
  }

  // Get touchpoint analytics
  static async getAnalytics(orgId, filters = {}) {
    let whereClause = 'WHERE l.org_id = $1';
    const values = [orgId];
    let paramIndex = 2;

    if (filters.startDate) {
      whereClause += ` AND t.occurred_at >= $${paramIndex}`;
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereClause += ` AND t.occurred_at <= $${paramIndex}`;
      values.push(filters.endDate);
      paramIndex++;
    }

    const sql = `
      SELECT
        t.event_type,
        t.channel,
        t.utm_source,
        t.utm_campaign,
        COUNT(*) as touchpoint_count,
        COUNT(DISTINCT t.lead_id) as unique_leads,
        COUNT(DISTINCT t.journey_id) as unique_journeys,
        MIN(t.occurred_at) as first_touch,
        MAX(t.occurred_at) as last_touch
      FROM touchpoints t
      INNER JOIN leads l ON t.lead_id = l.lead_id
      ${whereClause}
      GROUP BY t.event_type, t.channel, t.utm_source, t.utm_campaign
      ORDER BY touchpoint_count DESC
    `;

    try {
      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting touchpoint analytics:', error);
      throw error;
    }
  }
}

module.exports = Touchpoint;