/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../../lib/config');

const mongoCollection = config.mongo.collections.tnsWallet;

const tnsWalletSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  revenueNairaBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  fundingNairaBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  dPaymentNairaBalance: { // direct payment for international user
    default: 0.0,
    type: Number,
    min: 0,
  },
  totalPaymentNairaBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  revenueDollarBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  dPaymentDollarBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  totalPaymentDollarBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  revenueEuroBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  dPaymentEuroBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  totalPaymentEuroBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  revenuePoundsBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  dPaymentPoundsBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  totalPaymentPoundsBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
}, {
  toJSON: {
    transform(doc, ret) {
      ret.walletId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

tnsWalletSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, tnsWalletSchema);
