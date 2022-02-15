const Joi = require('@hapi/joi');

const partnerId = Joi.string();
const currencyCode = Joi.string();
const amount = Joi.number();
const bankTransactionId = Joi.string();

module.exports = {
  createSettlement: Joi.object({
    partnerId: partnerId.required().min(22),
    currencyCode: currencyCode.required().valid('NGN', 'USD', 'EUR', 'GBP'),
    amount: amount.required().min(3),
    bankTransactionId: bankTransactionId.required().min(5),
  }),

  editSettlement: Joi.object({
    amount: amount.min(3),
    bankTransactionId: bankTransactionId.min(5),
    currencyCode: currencyCode.valid('NGN', 'USD', 'EUR', 'GBP'),
  }),

};
