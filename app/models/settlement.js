/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.settlement;

const settlementSchema = new mongoose.Schema({
  partnerId: {
    required: true,
    type: String,
  },
  issuerId: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: Number,
  },
  currencyCode: {
    required: true,
    type: String,
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  bankTransactionId: {
    required: true,
    type: String,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.settlementId = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  timestamps: true,
});

settlementSchema.plugin(mongoosePaginate);

settlementSchema.index({ '$**': 'text' });


module.exports = mongoose.model(mongoCollection, settlementSchema);
