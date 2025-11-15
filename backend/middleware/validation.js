const Joi = require('joi');

const schemas = {
  leadCreate: Joi.object({
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().optional().allow(''),
    company: Joi.string().optional().allow(''),
    website: Joi.string().uri().optional().allow(''),
    country_code: Joi.string().length(2).optional().allow(''),
    country_name: Joi.string().optional().allow(''),
    state: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    program_interest: Joi.string().required(),
    consent_marketing: Joi.boolean().optional(),
    consent_sales: Joi.boolean().optional(),
    org_id: Joi.string().uuid().required(),
    journey_id: Joi.string().uuid().optional(),
    // UTM and source fields
    utm_source: Joi.string().optional().allow(''),
    utm_medium: Joi.string().optional().allow(''),
    utm_campaign: Joi.string().optional().allow(''),
    utm_term: Joi.string().optional().allow(''),
    utm_content: Joi.string().optional().allow(''),
    source_channel: Joi.string().optional().allow(''),
    page_url: Joi.string().uri().optional().allow('')
  }),

  leadUpdate: Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional().allow(''),
    company: Joi.string().optional().allow(''),
    website: Joi.string().uri().optional().allow(''),
    country_code: Joi.string().length(2).optional().allow(''),
    program_interest: Joi.string().optional(),
    stage: Joi.string().optional(),
    status: Joi.string().optional()
  }),

  touchpointCreate: Joi.object({
    journey_id: Joi.string().uuid().required(),
    event_type: Joi.string().required(),
    page_url: Joi.string().uri().required(),
    referrer_url: Joi.string().uri().optional().allow(null, ''),
    utm_source: Joi.string().optional().allow(null, ''),
    utm_medium: Joi.string().optional().allow(null, ''),
    utm_campaign: Joi.string().optional().allow(null, ''),
    utm_term: Joi.string().optional().allow(null, ''),
    utm_content: Joi.string().optional().allow(null, ''),
    session_id: Joi.string().optional(),
    is_bot: Joi.boolean().optional(),
    is_test: Joi.boolean().optional()
  }),

  startJourney: Joi.object({
    org_id: Joi.string().uuid().required(),
    page_url: Joi.string().uri().required(),
    referrer_url: Joi.string().uri().optional().allow(null, ''),
    utm_source: Joi.string().optional().allow(null, ''),
    utm_medium: Joi.string().optional().allow(null, ''),
    utm_campaign: Joi.string().optional().allow(null, ''),
    utm_term: Joi.string().optional().allow(null, ''),
    utm_content: Joi.string().optional().allow(null, ''),
    session_id: Joi.string().optional(),
    is_bot: Joi.boolean().optional(),
    is_test: Joi.boolean().optional()
  })
};

const validationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, "'"),
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorDetails,
      });
    }

    next();
  };
};

module.exports = { validationMiddleware, schemas };
