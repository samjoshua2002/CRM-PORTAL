const Journey = require('../models/Journey');
const Touchpoint = require('../models/Touchpoint');

class JourneyController {
  // Create new journey
  static async createJourney(req, res, next) {
    try {
      const {
        lead_id,
        status = 'pre_lead',
        started_at
      } = req.body;

      const journeyData = {
        lead_id,
        status,
        started_at: started_at || new Date()
      };

      const journey = await Journey.create(journeyData);

      res.status(201).json({
        success: true,
        data: journey,
        message: 'Journey created successfully'
      });
    } catch (error) {
      console.error('Error creating journey:', error);
      next(error);
    }
  }

  // Get journey by ID
  static async getJourney(req, res, next) {
    try {
      const { id } = req.params;
      const journey = await Journey.findById(id);

      if (!journey) {
        return res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
      }

      // Get journey touchpoints
      const touchpoints = await Touchpoint.findByJourneyId(id);

      res.json({
        success: true,
        data: {
          ...journey,
          touchpoints
        }
      });
    } catch (error) {
      console.error('Error getting journey:', error);
      next(error);
    }
  }

  // Get journey by lead ID
  static async getJourneyByLead(req, res, next) {
    try {
      const { lead_id } = req.params;
      const journey = await Journey.findByLeadId(lead_id);

      if (!journey) {
        return res.status(404).json({
          success: false,
          error: 'Journey not found for this lead'
        });
      }

      // Get journey touchpoints
      const touchpoints = await Touchpoint.findByJourneyId(journey.journey_id);

      res.json({
        success: true,
        data: {
          ...journey,
          touchpoints
        }
      });
    } catch (error) {
      console.error('Error getting journey by lead:', error);
      next(error);
    }
  }

  // Update journey
  static async updateJourney(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.journey_id;
      delete updateData.created_at;

      const updatedJourney = await Journey.update(id, updateData);

      if (!updatedJourney) {
        return res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
      }

      res.json({
        success: true,
        data: updatedJourney,
        message: 'Journey updated successfully'
      });
    } catch (error) {
      console.error('Error updating journey:', error);
      next(error);
    }
  }

  // Update journey status and link to lead
  static async updateJourneyWithLead(req, res, next) {
    try {
      const { id } = req.params;
      const { lead_id, status = 'lead_created' } = req.body;

      if (!lead_id) {
        return res.status(400).json({
          success: false,
          error: 'lead_id is required'
        });
      }

      const updatedJourney = await Journey.updateWithLead(id, lead_id, status);

      if (!updatedJourney) {
        return res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
      }

      res.json({
        success: true,
        data: updatedJourney,
        message: 'Journey updated with lead successfully'
      });
    } catch (error) {
      console.error('Error updating journey with lead:', error);
      next(error);
    }
  }

  // Complete journey
  static async completeJourney(req, res, next) {
    try {
      const { id } = req.params;
      const { status = 'converted' } = req.body;

      const completedJourney = await Journey.complete(id, status);

      if (!completedJourney) {
        return res.status(404).json({
          success: false,
          error: 'Journey not found'
        });
      }

      res.json({
        success: true,
        data: completedJourney,
        message: 'Journey completed successfully'
      });
    } catch (error) {
      console.error('Error completing journey:', error);
      next(error);
    }
  }

  // Get journey statistics
  static async getJourneyStats(req, res, next) {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const {
        start_date,
        end_date
      } = req.query;

      const filters = {
        org_id,
        startDate: start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: end_date ? new Date(end_date) : new Date()
      };

      const stats = await Journey.getStats(filters);

      res.json({
        success: true,
        data: stats,
        filters
      });
    } catch (error) {
      console.error('Error getting journey stats:', error);
      next(error);
    }
  }

  // Get conversion funnel
  static async getConversionFunnel(req, res, next) {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const {
        start_date,
        end_date
      } = req.query;

      const filters = {
        org_id,
        startDate: start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: end_date ? new Date(end_date) : new Date()
      };

      const funnel = await Journey.getFunnel(filters);

      res.json({
        success: true,
        data: funnel,
        filters
      });
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      next(error);
    }
  }

  // Get all journeys for organization
  static async getAllJourneys(req, res, next) {
    try {
      const { org_id } = req.query;

      if (!org_id) {
        return res.status(400).json({
          success: false,
          error: 'org_id is required'
        });
      }

      const {
        page = 1,
        limit = 50,
        status
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE l.org_id = $1';
      const values = [org_id];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND j.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      const sql = `
        SELECT j.*, l.first_name, l.last_name, l.email, l.status as lead_status
        FROM journeys j
        LEFT JOIN leads l ON j.lead_id = l.lead_id
        ${whereClause}
        ORDER BY j.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(parseInt(limit), parseInt(offset));

      const result = await query(sql, values);

      // Get total count for pagination
      const countSql = `SELECT COUNT(*) FROM journeys j LEFT JOIN leads l ON j.lead_id = l.lead_id ${whereClause}`;
      const countValues = values.slice(0, -2); // Remove limit and offset
      const countResult = await query(countSql, countValues);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting all journeys:', error);
      next(error);
    }
  }
}

module.exports = JourneyController;