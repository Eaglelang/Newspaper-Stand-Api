/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.duration;

const otpSchema = new mongoose.Schema({
  durationId: {
    type: String,
  },
  daily: {
    required: true,
    type: Number,
  },
  weekly: {
    required: true,
    type: Number,
  },
  monthly: {
    required: true,
    type: Number,
  },
  quarterly: {
    required: true,
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


module.exports = mongoose.model(mongoCollection, otpSchema);
