/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.settlementSetting;

const settlementSettingSchema = new mongoose.Schema({
  partnerId: {
    required: true,
    type: String,
  },
  createdBy: {
    required: true,
    type: String,
  },
  deductionType: {
    required: true,
    type: String,
    enum: ['percent', 'value'],
  },
  deductionValue: {
    required: true,
    type: Number,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.settlementSettingId = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  timestamps: true,
});

settlementSettingSchema.plugin(mongoosePaginate);

settlementSettingSchema.index({ '$**': 'text' });


module.exports = mongoose.model(mongoCollection, settlementSettingSchema);
