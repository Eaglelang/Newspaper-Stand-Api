const Joi = require('@hapi/joi');

const productId = Joi.array().items(Joi.string());
const bundleId = Joi.string();
const duration = Joi.string();
const provider = Joi.string();
const device = Joi.string();
const recurring = Joi.bool();
const couponCode = Joi.string();
const freemium = Joi.bool();
const transactionId = Joi.number();

module.exports = {
  createProductSubscription: Joi.object({
    productId: productId.required(),
    duration: duration.required(),
    device: device.required().valid('pwa', 'android', 'ios'),
    couponCode: couponCode.optional(),
    recurring: recurring.required(),
    freemium: freemium.optional(),
  }),

  createBundleSubscription: Joi.object({
    bundleId: bundleId.required(),
    productId: productId.required(),
    duration: duration.required(),
    device: device.required().valid('pwa', 'android', 'ios'),
    transactionId: transactionId.required(),
    provider: provider.required(),
    couponCode: couponCode.optional(),
    freemium: freemium.optional(),
  }),

};
