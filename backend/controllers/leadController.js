const Lead = require('../models/Lead');
const Journey = require('../models/Journey');
const Touchpoint = require('../models/Touchpoint');
const LeadScoringService = require('../services/leadScoringService');
const AssignmentService = require('../services/assignmentService');
const { transaction } = require('../config/database');

class LeadController {
  // Create new lead - main lead capture endpoint
  static async createLead(req, res, next) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        company,
        website,
        country_code,
        country_name,
        state,
        city,
        program_interest,
        consent_marketing,
        consent_sales,
        org_id,
        journey_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        source_channel,
        page_url
      } = req.body;

      // Validate required fields
      if (!first_name || !email || !org_id) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: first_name, email, org_id'
        });
      }

      // Use transaction for lead creation flow
      const result = await transaction(async (client) => {
        // Create or update journey if provided
        let journey = null;
        if (journey_id) {
          journey = await Journey.updateWithLead(journey_id, null, 'lead_created');
        } else {
          // Create new journey
          journey = await Journey.create({
            lead_id: null,
            status: 'lead_created'
          });
        }

        // Create lead
        const leadData = {
          first_name,
          last_name,
          email,
          phone,
          company,
          website,
          country_code,
          country_name,
          state,
          city,
          program_interest,
          consent_marketing,
          consent_sales,
          org_id,
          journey_id: journey.journey_id,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          source_channel,
          source_raw: 'web_form'
        };

        const lead = await Lead.create(leadData);

        // Update journey with lead_id
        await Journey.updateWithLead(journey.journey_id, lead.lead_id, 'lead_created');

        // Create form submission touchpoint
        await Touchpoint.createFormSubmission(lead.lead_id, journey.journey_id, {
          page_url
        }, {
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content
        });

        // Update lead with first and last touchpoint IDs
        const touchpoints = await Touchpoint.findByJourneyId(journey.journey_id);
        if (touchpoints.length > 0) {
          const firstTouchpoint = touchpoints[0];
          const lastTouchpoint = touchpoints[touchpoints.length - 1];

          await Lead.update(lead.lead_id, {
            first_touch_id: firstTouchpoint.touchpoint_id,
            last_touch_id: lastTouchpoint.touchpoint_id
          });
        }

        return lead;
      });

      // Calculate lead score after creation
      try {
        await LeadScoringService.calculateLeadScore(result.lead_id);
      } catch (scoringError) {
        console.error('Lead scoring failed:', scoringError);
        // Don't fail the request if scoring fails
      }

      // Try to assign lead to counselor
      try {
        const assignment = await AssignmentService.assignLead(result.lead_id, org_id);
        result.assigned_counselor = assignment.counselor_id;
        result.assignment_date = assignment.assigned_at;
      } catch (assignmentError) {
        console.error('Lead assignment failed:', assignmentError);
        // Don't fail the request if assignment fails
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'Lead created successfully'
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      next(error);
    }
  }

  // Get all leads with pagination and filtering
  static async getLeads(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        stage,
        assigned_counselor,
        hotness,
        org_id
      } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const filters = {
        status,
        stage,
        assigned_counselor,
        hotness
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await Lead.findAll(
        org_id,
        parseInt(page),
        parseInt(limit),
        filters
      );

      res.json({
        success: true,
        data: result.leads,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Error getting leads:', error);
      next(error);
    }
  }

  // Get lead by ID
  static async getLead(req, res, next) {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }

      // Get related data
      const [education, experience, testScores, journey, touchpoints] = await Promise.all([
        Touchpoint.query('SELECT * FROM lead_education WHERE lead_id = $1 ORDER BY is_highest DESC', [id]),
        Touchpoint.query('SELECT * FROM lead_experiences WHERE lead_id = $1 ORDER BY start_date DESC', [id]),
        Touchpoint.query('SELECT * FROM lead_test_scores WHERE lead_id = $1 ORDER BY percentile DESC', [id]),
        Journey.findByLeadId(id),
        Touchpoint.findByLeadId(id)
      ]);

      res.json({
        success: true,
        data: {
          ...lead,
          education: education.rows,
          experience: experience.rows,
          testScores: testScores.rows,
          journey,
          touchpoints
        }
      });
    } catch (error) {
      console.error('Error getting lead:', error);
      next(error);
    }
  }

  // Update lead
  static async updateLead(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.lead_id;
      delete updateData.org_id;
      delete updateData.created_at;
      delete updateData.lead_score;
      delete updateData.hotness_snapshot;
      delete updateData.last_scored_at;

      const updatedLead = await Lead.update(id, updateData);

      if (!updatedLead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }

      // Recalculate score if relevant fields were updated
      const scoreFields = ['program_interest', 'country_code', 'education_level'];
      const hasScoreUpdate = Object.keys(updateData).some(field => scoreFields.includes(field));

      if (hasScoreUpdate) {
        try {
          await LeadScoringService.calculateLeadScore(id);
          // Get updated lead with new scores
          const scoredLead = await Lead.findById(id);
          return res.json({
            success: true,
            data: scoredLead,
            message: 'Lead updated and rescored successfully'
          });
        } catch (scoringError) {
          console.error('Lead rescoring failed:', scoringError);
        }
      }

      res.json({
        success: true,
        data: updatedLead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      next(error);
    }
  }

  // Score lead manually
  static async scoreLead(req, res, next) {
    try {
      const { id } = req.params;
      const result = await LeadScoringService.calculateLeadScore(id);

      res.json({
        success: true,
        data: result,
        message: 'Lead scored successfully'
      });
    } catch (error) {
      console.error('Error scoring lead:', error);
      next(error);
    }
  }

  // Assign lead to counselor
  static async assignLead(req, res, next) {
    try {
      const { id } = req.params;
      const { org_id } = req.body;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const result = await AssignmentService.assignLead(id, org_id);

      res.json({
        success: true,
        data: result,
        message: 'Lead assigned successfully'
      });
    } catch (error) {
      console.error('Error assigning lead:', error);
      next(error);
    }
  }

  // Reassign lead to different counselor
  static async reassignLead(req, res, next) {
    try {
      const { id } = req.params;
      const { new_counselor_id, reason } = req.body;

      if (!new_counselor_id || !reason) {
        return res.status(400).json({
          success: false,
          error: 'new_counselor_id and reason are required'
        });
      }

      const result = await AssignmentService.reassignLead(id, new_counselor_id, reason);

      res.json({
        success: true,
        data: result,
        message: 'Lead reassigned successfully'
      });
    } catch (error) {
      console.error('Error reassigning lead:', error);
      next(error);
    }
  }

  // Get lead statistics
  static async getLeadStats(req, res, next) {
    try {
      const { org_id, start_date, end_date } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      // Get lead counts by status
      const statusSql = `
        SELECT
          status,
          COUNT(*) as count
        FROM leads
        WHERE org_id = $1
        AND created_at >= $2
        AND created_at <= $3
        GROUP BY status
      `;

      // Get lead counts by hotness
      const hotnessSql = `
        SELECT
          hotness_snapshot,
          COUNT(*) as count
        FROM leads
        WHERE org_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND hotness_snapshot IS NOT NULL
        GROUP BY hotness_snapshot
      `;

      // Get conversion rate
      const conversionSql = `
        SELECT
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END)::float / COUNT(*) * 100 as conversion_rate
        FROM leads
        WHERE org_id = $1
        AND created_at >= $2
        AND created_at <= $3
      `;

      const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end_date || new Date();

      const [statusResult, hotnessResult, conversionResult] = await Promise.all([
        query(statusSql, [org_id, startDate, endDate]),
        query(hotnessSql, [org_id, startDate, endDate]),
        query(conversionSql, [org_id, startDate, endDate])
      ]);

      res.json({
        success: true,
        data: {
          status_counts: statusResult.rows,
          hotness_counts: hotnessResult.rows,
          conversion_stats: conversionResult.rows[0],
          period: {
            start_date: startDate,
            end_date: endDate
          }
        }
      });
    } catch (error) {
      console.error('Error getting lead stats:', error);
      next(error);
    }
  }

  // Get leads by counselor
  static async getLeadsByCounselor(req, res, next) {
    try {
      const { counselor_id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await Lead.findByCounselor(
        counselor_id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.leads,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Error getting leads by counselor:', error);
      next(error);
    }
  }
}

module.exports = LeadController;