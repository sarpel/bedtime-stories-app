// middleware/validation.js
const Joi = require('joi');

// Input validation schemas
const schemas = {
  story: Joi.object({
    storyText: Joi.string().required().min(10).max(50000),
    storyType: Joi.string().required(),
    customTopic: Joi.string().allow('').max(1000),
    isFavorite: Joi.boolean().default(false)
  }),
  llmRequest: Joi.object({
    prompt: Joi.string().required().min(10).max(5000),
    storyType: Joi.string().required(),
    customTopic: Joi.string().allow('').max(1000)
  }),
  ttsRequest: Joi.object({
    text: Joi.string().required().min(1).max(50000),
    voiceId: Joi.string().required(),
    storyId: Joi.number().integer().positive().required()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.details.map(detail => detail.message)
      });
    }
    req.body = value;
    next();
  };
};

module.exports = {
  schemas,
  validate
};
