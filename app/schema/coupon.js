const Joi = require('@hapi/joi');

const forProducts = Joi.array();
const couponCode = Joi.string();
const limited = Joi.boolean();
const startDate = Joi.date();
const expiration = Joi.boolean();
const discountType = Joi.string();
const endDate = Joi.string();
const numberAvailable = Joi.number();
const discountValue = Joi.number();
const couponFor = Joi.string();
const ownerType = Joi.string();

module.exports = {
  createCoupon: Joi.object({
    forProducts: forProducts.required(),
    couponCode: couponCode.required(),
    limited: limited.required(),
    numberAvailable: numberAvailable.optional(),
    startDate: startDate.required(),
    expiration: expiration.required(),
    endDate: endDate.optional(),
    discountType: discountType.required(),
    discountValue: discountValue.required(),
    couponFor: couponFor.required(),
    ownerType: ownerType.required(),
  }),

  editCoupon: Joi.object({
    forProducts: forProducts.optional(),
    couponCode: couponCode.required(),
    limited: limited.optional(),
    startDate: startDate.optional(),
    expiration: expiration.optional(),
    discountType: discountType.optional(),
    discountValue: discountValue.optional(),
    couponFor: couponFor.optional(),
    ownerType: ownerType.optional(),
  }),

};
