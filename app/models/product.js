/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.product;

const productSchema = new mongoose.Schema({
  partnerId: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: config.mongo.collections.partner,
  },
  image: {
    required: true,
    type: String,
  },
  productTitle: {
    required: true,
    type: String,
  },
  productDescription: {
    required: true,
    type: String,
  },
  numberOfPages: {
    required: true,
    type: Number,
  },
  subscription: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'disabled',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive',
  },
  productType: {
    required: true,
    type: String,
    enum: ['newspaper', 'magazine'],
  },
  productCost: {
    required: true,
    type: Number,
  },
  productPrice: {
    default: 0,
    type: Number,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.productId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

productSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, productSchema);
