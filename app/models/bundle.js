/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.bundle;

const bundleSchema = new mongoose.Schema({
  creatorId: {
    required: true,
    type: String,
  },
  bundleName: {
    required: true,
    type: String,
  },
  numberOfProduct: {
    required: true,
    type: Number,
  },
  numberOfNewspaper: {
    required: true,
    type: Number,
  },
  numberOfMagazine: {
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
    default: 'active',
  },
  priceOfBundle: {
    default: 0,
    type: Number,
  },
  image: {
    required: true,
    type: String,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.bundleId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

bundleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, bundleSchema);
