const Joi = require('@hapi/joi');

const partnerId = Joi.string();
const deductionType = Joi.string();
const deductionValue = Joi.number();

module.exports = {
  createSettlementSetting: Joi.object({
    partnerId: partnerId.required().min(22),
    deductionType: deductionType.required().valid('percent', 'value'),
    deductionValue: deductionValue.required(),
  }),

  editSettlementSetting: Joi.object({
    deductionType,
    deductionValue,
  }),

};
