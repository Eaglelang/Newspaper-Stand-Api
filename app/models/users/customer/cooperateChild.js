/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../../lib/config');

const mongoCollection = config.mongo.collections.customer.cooperate.child;

const customerSchema = new mongoose.Schema({
  firstname: {
    type: String,
  },
  lastname: {
    type: String,
  },
  businessId: {
    required: true,
    type: String,
  },
  phoneNumber: {
    required: true,
    type: String,
  },
  country: {
    required: true,
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
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
      ret.businessChildId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

customerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, customerSchema);
