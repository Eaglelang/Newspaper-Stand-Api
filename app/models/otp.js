/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.otp;

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    required: true,
    type: String,
  },
  otp: {
    required: true,
    type: String,
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
