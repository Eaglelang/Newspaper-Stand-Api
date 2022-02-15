const Joi = require('@hapi/joi');

const productTitle = Joi.string();
const productDescription = Joi.string();
const numberOfPages = Joi.number();
const productType = Joi.string();
const productCost = Joi.number();
const productPrice = Joi.number();

module.exports = {
  createProduct: Joi.object({
    productTitle: productTitle.required(),
    productDescription: productDescription.required(),
    numberOfPages: numberOfPages.required(),
    productType: productType.required(),
    productCost: productCost.required(),
  }),

  editProduct: Joi.object({
    productTitle,
    productDescription,
    numberOfPages,
    productType,
    productCost,
  }),

  setProductPrice: Joi.object({
    productPrice: productPrice.required(),
  }),

};
