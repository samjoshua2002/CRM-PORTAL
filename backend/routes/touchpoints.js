const express = require('express');
const TouchpointController = require('../controllers/touchpointController');
const { validationMiddleware, schemas } = require('../middleware/validation');

const router = express.Router();

// POST /api/touchpoints/start - Create a new journey and initial touchpoint for a visitor
router.post('/start', validationMiddleware(schemas.startJourney), TouchpointController.startJourney);

// POST /api/touchpoints - Create a touchpoint for an existing journey
router.post('/', validationMiddleware(schemas.touchpointCreate), TouchpointController.createInitialTouchpoint);

// GET /api/touchpoints/journey/:journey_id - Get all touchpoints for a journey
router.get('/journey/:journey_id', TouchpointController.getTouchpointsByJourney);

// GET /api/touchpoints/lead/:lead_id - Get all touchpoints for a lead
router.get('/lead/:lead_id', TouchpointController.getTouchpointsByLead);

// GET /api/touchpoints/attribution/:lead_id - Get attribution data for a lead
router.get('/attribution/:lead_id', TouchpointController.getAttribution);

// GET /api/touchpoints/analytics - Get touchpoint analytics
router.get('/analytics', TouchpointController.getAnalytics);

// PUT /api/touchpoints/:touchpoint_id - Update a touchpoint with lead info
router.put('/:touchpoint_id', TouchpointController.updateTouchpointWithLead);

module.exports = router;