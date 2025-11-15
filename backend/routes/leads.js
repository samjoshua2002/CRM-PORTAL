const express = require('express');
const LeadController = require('../controllers/leadController');

const router = express.Router();

// POST /api/leads - Create new lead (main lead capture endpoint)
router.post('/', LeadController.createLead);

// GET /api/leads - Get all leads with pagination and filtering
router.get('/', LeadController.getLeads);

// GET /api/leads/stats - Get lead statistics
router.get('/stats', LeadController.getLeadStats);

// GET /api/leads/:id - Get lead by ID with related data
router.get('/:id', LeadController.getLead);

// PUT /api/leads/:id - Update lead
router.put('/:id', LeadController.updateLead);

// POST /api/leads/:id/score - Manually score lead
router.post('/:id/score', LeadController.scoreLead);

// POST /api/leads/:id/assign - Assign lead to counselor
router.post('/:id/assign', LeadController.assignLead);

// PUT /api/leads/:id/reassign - Reassign lead to different counselor
router.put('/:id/reassign', LeadController.reassignLead);

// GET /api/leads/counselor/:counselor_id - Get leads by counselor
router.get('/counselor/:counselor_id', LeadController.getLeadsByCounselor);

module.exports = router;