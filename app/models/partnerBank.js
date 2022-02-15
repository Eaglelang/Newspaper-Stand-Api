/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.partnerBank;

const transactionSchema = new mongoose.Schema({
  partnerId: {
    required: true,
    type: String,
  },
  bank: {
    required: true,
    type: String,
  },
  accountName: {
    required: true,
    type: String,
  },
  accountNumber: {
    required: true,
    type: String,
  },
},
{
  toJSON: {
    transform(doc, ret) {
      ret.partnerBankId = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
    },
  },
  timestamps: true,
});

transactionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, transactionSchema);
