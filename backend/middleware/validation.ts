// middleware/validation.ts
import Joi from 'joi';
import type { Request, Response, NextFunction } from 'express';

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
const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.details.map(detail => detail.message)
      });
      return;
    }
    req.body = value;
    next();
  };
};

export {
  schemas,
  validate
};
