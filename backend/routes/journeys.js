const express = require('express');
const JourneyController = require('../controllers/journeyController');

const router = express.Router();

// GET /api/journeys - Get all journeys for an organization
router.get('/', JourneyController.getAllJourneys);

// POST /api/journeys - Create a new journey
router.post('/', JourneyController.createJourney);

// GET /api/journeys/stats - Get journey statistics
router.get('/stats', JourneyController.getJourneyStats);

// GET /api/journeys/funnel - Get conversion funnel
router.get('/funnel', JourneyController.getConversionFunnel);

// GET /api/journeys/:id - Get journey by ID
router.get('/:id', JourneyController.getJourney);

// GET /api/journeys/lead/:lead_id - Get journey by lead ID
router.get('/lead/:lead_id', JourneyController.getJourneyByLead);

// PUT /api/journeys/:id - Update journey
router.put('/:id', JourneyController.updateJourney);

// PUT /api/journeys/:id/link-lead - Update journey with lead information
router.put('/:id/link-lead', JourneyController.updateJourneyWithLead);

// PUT /api/journeys/:id/complete - Mark a journey as complete
router.put('/:id/complete', JourneyController.completeJourney);

module.exports = router;