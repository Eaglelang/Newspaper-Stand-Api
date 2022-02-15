/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../lib/config');

const mongoCollection = config.mongo.collections.partner;

const partnerSchema = new mongoose.Schema({
  firstname: {
    required: true,
    type: String,
  },
  lastname: {
    required: true,
    type: String,
  },
  dob: {
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
    type: String,
  },
  profilePic: {
    type: String,
  },
  cacNumber: {
    type: String,
  },
  companyName: {
    type: String,
  },
  companyAddress: {
    type: String,
  },
  companyPhoneNumber: {
    type: String,
  },
  companyEmail: {
    type: String,
  },
  role: {
    required: true,
    type: String,
    enum: ['partner-admin', 'user'],
  },
  creatorId: {
    type: String,
    require: true,
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
      ret.partnerId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

partnerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, partnerSchema);
