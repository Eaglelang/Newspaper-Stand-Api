/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/**
 * @Author: Abass
 * @Objective: building to scale
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const config = require('../lib/config');

const mongoCollection = config.mongo.collections.transaction;

const transactionSchema = new mongoose.Schema({
  status: {
    required: true,
    type: String,
    enum: ['fail', 'initiating', 'pending', 'success'],
  },
  transactionId: {
    required: true,
    type: String,
  },
  transactionTitle: {
    required: true,
    type: String,
  },
  detail: {
    required: true,
    type: String,
  },
  side: {
    type: String,
    enum: ['credit', 'debit'],
  },
  amount: {
    type: Number,
  },
  userId: {
    required: true,
    type: String,
  },
  unifiedResponse: {
    type: Object,
    default: undefined,
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

transactionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(mongoCollection, transactionSchema);
