/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../../lib/config');

const mongoCollection = config.mongo.collections.customer.individual.parent;

const customerSchema = new mongoose.Schema({
  firstname: {
    required: true,
    type: String,
  },
  lastname: {
    required: true,
    type: String,
  },
  dob: {
    required: true,
    type: Date,
  },
  phoneNumber: {
    required: true,
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  isTrial: {
    type: Boolean,
    default: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  email: {
    required: true,
    type: String,
    unique: true,
  },
  password: {
    required: true,
    type: String,
    minlength: 6,
  },
  country: {
    required: true,
    type: String,
  },
  profilePic: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Number,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.customerId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

customerSchema.plugin(mongoosePaginate);

customerSchema.index({ '$**': 'text' });

module.exports = mongoose.model(mongoCollection, customerSchema);
