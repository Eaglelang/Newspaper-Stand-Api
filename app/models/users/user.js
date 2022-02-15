/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../../lib/config');

const mongoCollection = config.mongo.collections.user;

const userSchema = new mongoose.Schema({
  firstname: {
    required: true,
    type: String,
  },
  lastname: {
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
  profilePic: {
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
  role: {
    required: true,
    type: String,
    enum: ['super-admin', 'admin', 'user-admin'],
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
      ret.adminId = ret._id;
      delete ret.__v;
      delete ret._id;
    },
  },
  timestamps: true,
});

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, userSchema);
