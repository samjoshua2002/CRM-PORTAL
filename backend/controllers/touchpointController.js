const Touchpoint = require('../models/Touchpoint');
const Journey = require('../models/Journey');
const { v4: uuidv4 } = require('uuid');

class TouchpointController {
  // Create initial touchpoint for anonymous visitor
  static async createInitialTouchpoint(req, res, next) {
    try {
      const {
        journey_id,
        event_type = 'page_view',
        page_url,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        session_id,
        is_bot = false,
        is_test = false
      } = req.body;

      if (!journey_id || !page_url) {
        return res.status(400).json({
          success: false,
          error: 'journey_id and page_url are required'
        });
      }

      const touchpointData = {
        journey_id,
        event_type,
        page_url,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        ingest_source: 'web',
        event_id: session_id || uuidv4(),
        is_bot,
        is_test
      };

      const touchpoint = await Touchpoint.create(touchpointData);

      res.status(201).json({
        success: true,
        data: touchpoint,
        message: 'Initial touchpoint created successfully'
      });
    } catch (error) {
      console.error('Error creating initial touchpoint:', error);
      next(error);
    }
  }

  // Create journey and initial touchpoint for new visitor
  static async startJourney(req, res, next) {
    try {
      const {
        org_id,
        page_url,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        session_id,
        is_bot = false,
        is_test = false
      } = req.body;

      if (!org_id || !page_url) {
        return res.status(400).json({
          success: false,
          error: 'org_id and page_url are required'
        });
      }

      // Create new journey
      const journey = await Journey.create({
        lead_id: null,
        status: 'pre_lead',
        started_at: new Date()
      });

      // Create initial touchpoint
      const touchpointData = {
        journey_id: journey.journey_id,
        event_type: 'page_view',
        page_url,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        ingest_source: 'web',
        event_id: session_id || uuidv4(),
        is_bot,
        is_test
      };

      const touchpoint = await Touchpoint.create(touchpointData);

      res.status(201).json({
        success: true,
        data: {
          journey_id: journey.journey_id,
          touchpoint_id: touchpoint.touchpoint_id
        },
        message: 'Journey started successfully'
      });
    } catch (error) {
      console.error('Error starting journey:', error);
      next(error);
    }
  }

  // Get touchpoints by journey ID
  static async getTouchpointsByJourney(req, res, next) {
    try {
      const { journey_id } = req.params;
      const { limit = 100 } = req.query;

      const touchpoints = await Touchpoint.findByJourneyId(journey_id, parseInt(limit));

      res.json({
        success: true,
        data: touchpoints
      });
    } catch (error) {
      console.error('Error getting touchpoints by journey:', error);
      next(error);
    }
  }

  // Get touchpoints by lead ID
  static async getTouchpointsByLead(req, res, next) {
    try {
      const { lead_id } = req.params;
      const { limit = 100 } = req.query;

      const touchpoints = await Touchpoint.findByLeadId(lead_id, parseInt(limit));

      res.json({
        success: true,
        data: touchpoints
      });
    } catch (error) {
      console.error('Error getting touchpoints by lead:', error);
      next(error);
    }
  }

  // Get attribution data for a lead
  static async getAttribution(req, res, next) {
    try {
      const { lead_id } = req.params;
      const { model = 'first_click' } = req.query;

      const attribution = await Touchpoint.getAttribution(lead_id, model);

      res.json({
        success: true,
        data: attribution,
        model
      });
    } catch (error) {
      console.error('Error getting attribution:', error);
      next(error);
    }
  }

  // Get touchpoint analytics
  static async getAnalytics(req, res, next) {
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
        end_date,
        event_type,
        channel,
        utm_source,
        utm_campaign
      } = req.query;

      const filters = {
        org_id,
        startDate: start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: end_date ? new Date(end_date) : new Date(),
        event_type,
        channel,
        utm_source,
        utm_campaign
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const analytics = await Touchpoint.getAnalytics(filters);

      res.json({
        success: true,
        data: analytics,
        filters
      });
    } catch (error) {
      console.error('Error getting touchpoint analytics:', error);
      next(error);
    }
  }

  // Update touchpoint with lead information
  static async updateTouchpointWithLead(req, res, next) {
    try {
      const { touchpoint_id } = req.params;
      const { lead_id, journey_id } = req.body;

      if (!lead_id || !journey_id) {
        return res.status(400).json({
          success: false,
          error: 'lead_id and journey_id are required'
        });
      }

      const updatedTouchpoint = await Touchpoint.updateWithLead(touchpoint_id, lead_id, journey_id);

      if (!updatedTouchpoint) {
        return res.status(404).json({
          success: false,
          error: 'Touchpoint not found'
        });
      }

      res.json({
        success: true,
        data: updatedTouchpoint,
        message: 'Touchpoint updated successfully'
      });
    } catch (error) {
      console.error('Error updating touchpoint:', error);
      next(error);
    }
  }
}

module.exports = TouchpointController;