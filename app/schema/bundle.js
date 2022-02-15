const Joi = require('@hapi/joi');

const bundleName = Joi.string();
const numberOfProduct = Joi.number();
const numberOfNewspaper = Joi.number();
const numberOfMagazine = Joi.number();
const priceOfBundle = Joi.number();

module.exports = {
  createBundle: Joi.object({
    bundleName: bundleName.required(),
    numberOfProduct: numberOfProduct.required(),
    numberOfNewspaper: numberOfNewspaper.required(),
    numberOfMagazine: numberOfMagazine.required(),
    priceOfBundle: priceOfBundle.required(),
  }),

  editBundle: Joi.object({
    bundleName,
    numberOfProduct,
    numberOfNewspaper,
    numberOfMagazine,
    priceOfBundle,
  }),

};
