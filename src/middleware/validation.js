import Joi from 'joi';
import { ValidationError } from './errorHandler.js';

// Validation middleware factory
export const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const dataToValidate = req[source];
        const { error, value } = schema.validate(dataToValidate, { 
            abortEarly: false,
            stripUnknown: true 
        });
        
        if (error) {
            // Pass the Joi error object directly to the error handler
            next(error);
        } else {
            req[source] = value;
            next();
        }
    };
};

// Custom validation for MongoDB ObjectID
const objectId = () => Joi.string().hex().length(24);

// Validation schemas
export const schemas = {
    // Channel schemas
    createChannel: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        logo_url: Joi.string().uri().optional().allow('', null),
        sort_order: Joi.number().integer().min(0).optional().default(0),
        category_id: objectId().optional().allow(null),
        streams: Joi.array().items(Joi.object({
            url: Joi.string().uri().required(),
            label: Joi.string().max(50).optional().allow(''),
            // New optional stream credential fields
            userAgent: Joi.string().optional().allow('', null),
            referer: Joi.string().optional().allow('', null),
            origin: Joi.string().optional().allow('', null),
            cookie: Joi.string().optional().allow('', null),
            is_active: Joi.boolean().optional().default(true),
            sort_order: Joi.number().integer().min(0).optional().default(0)
        })).min(1).required()
    }),
    
    updateChannel: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional(),
        logo_url: Joi.string().uri().optional().allow('', null),
        is_active: Joi.boolean().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        category_id: objectId().optional().allow(null),
        streams: Joi.array().items(Joi.object({
            url: Joi.string().uri().required(),
            label: Joi.string().max(50).optional().allow(''),
            // New optional stream credential fields
            userAgent: Joi.string().optional().allow('', null),
            referer: Joi.string().optional().allow('', null),
            origin: Joi.string().optional().allow('', null),
            cookie: Joi.string().optional().allow('', null),
            is_active: Joi.boolean().optional().default(true),
            sort_order: Joi.number().integer().min(0).optional().default(0)
        })).min(0).optional()
    }),
    
    // Category schemas
    createCategory: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        logo_url: Joi.string().uri().optional().allow('', null),
        sort_order: Joi.number().integer().min(0).optional().default(0),
        is_active: Joi.boolean().optional()
    }),
    
    updateCategory: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional(),
        logo_url: Joi.string().uri().optional().allow('', null),
        sort_order: Joi.number().integer().min(0).optional(),
        is_active: Joi.boolean().optional()
    }),
    
    // Match-channel linking schema
    linkChannels: Joi.object({
        match_id: Joi.string().required(),
        channel_ids: Joi.array().items(objectId()).min(0).required()
    }),
    
    // Date parameter schema
    dateParam: Joi.object({
        date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    }),
    
    // ID parameter schema
    idParam: Joi.object({
        id: objectId().required()
    }),
    
    // Match ID parameter schema
    matchIdParam: Joi.object({
        match_id: Joi.string().required()
    }),

    // **إضافة مخطط التحقق من حقل 'limit'**
    limitQuery: Joi.object({
        limit: Joi.number().integer().min(1).max(100).optional().default(10)
    })
};