/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.coupon;

const couponSchema = new mongoose.Schema({
  forProducts: [{
    type: String,
    required: true,
  }],
  couponCode: {
    required: true,
    type: String,
  },
  numberAvailable: {
    type: Number,
  },
  limited: {
    default: true,
    type: Boolean,
  },
  startDate: {
    required: true,
    type: Date,
  },
  endDate: {
    type: Date,
  },
  expiration: {
    default: true,
    type: Boolean,
  },
  count: {
    default: 0,
    type: Number,
  },
  discountType: {
    type: String,
    enum: ['percent', 'amount'],
    required: true,
  },
  discountValue: {
    required: true,
    type: Number,
  },
  couponFor: {
    type: String,
    enum: ['local', 'international'],
    required: true,
  },
  ownerType: {
    type: String,
    enum: ['tns'],
    required: true,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.couponId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

couponSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, couponSchema);
