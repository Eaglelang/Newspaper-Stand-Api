/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../../lib/config');

const mongoCollection = config.mongo.collections.customer.wallet;

const walletSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  amount: {
    default: 0.0,
    min: 0,
    type: Number,
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

walletSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, walletSchema);
