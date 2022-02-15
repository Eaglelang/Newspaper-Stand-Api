/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../../lib/config');

const mongoCollection = config.mongo.collections.partnerWallet;

const walletSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  nairaBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  dollarBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  euroBalance: {
    default: 0.0,
    type: Number,
    min: 0,
  },
  poundsBalance: {
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

walletSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, walletSchema);
