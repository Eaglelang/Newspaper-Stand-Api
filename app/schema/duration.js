const Joi = require('@hapi/joi');

const daily = Joi.number();
const weekly = Joi.number();
const monthly = Joi.number();
const quarterly = Joi.number();

module.exports = {
  createDuration: Joi.object({
    daily: daily.required(),
    weekly: weekly.required(),
    monthly: monthly.required(),
    quarterly: quarterly.required(),
  }),

  editDuration: Joi.object({
    daily,
    weekly,
    monthly,
    quarterly,
  }),

};
