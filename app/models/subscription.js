/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.subscription;

const subscriptionSchema = new mongoose.Schema({
  customerId: {
    required: true,
    type: String,
  },
  productId: [{
    type: String,
  }],
  bundleId: {
    type: String,
  },
  subscriptionCost: {
    type: Number,
  },
  country: {
    type: String,
  },
  userType: {
    type: String,
    required: true,
  },
  recurring: {
    type: Boolean,
    required: true,
  },
  device: {
    type: String,
    required: true,
    enum: ['pwa', 'android', 'ios'],
  },
  subscriptionType: {
    required: true,
    type: String,
    enum: ['bundle', 'singleProduct'],
  },
  duration: {
    required: true,
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  dateOfSubscription: {
    required: true,
    type: Date,
  },
  endOfSubscriptionDate: {
    required: true,
    type: Date,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.subscriptionId = ret._id;
      delete ret.__v;
      delete ret._id;
      delete ret.createdAt;
      delete ret.updatedAt;
    },
  },
  timestamps: true,
});

subscriptionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, subscriptionSchema);
