/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.setting;

const settingSchema = new mongoose.Schema({
  settingId: {
    required: true,
    type: String,
  },
  walletMinimumAmount: {
    default: 500,
    type: Number,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});


module.exports = mongoose.model(mongoCollection, settingSchema);
