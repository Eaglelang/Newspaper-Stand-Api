/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const logger = require('../lib/logger');
const Job = require('./jobs/agender');
const { payoutAggregator } = require('./helper');

class Payout {
  async initiatePayout(req, res) {
    payoutAggregator.then((aggregate) => {
      if (aggregate.length > 0) {
        return Response.success(res, {
          message: 'payout list successully aggregated',
          response: aggregate,
        }, httpCode.OK);
      }
      Response.success(res, {
        message: 'payout list is empty',
        response: [],
      }, httpCode.OK);
    }).catch((error) => {
      logger.info(error);
      return Response.failure(res, {
        message: 'cannot get payout, try again later',
        response: error,
      }, httpCode.INTERNAL_SERVER_ERROR);
    });
  }

  async initiateSendSchedledEmail(req, res) {
    try {
      await Job.schedulePayoutTime();
      return Response.success(res, {
        message: 'payout list successully aggregated',
      }, httpCode.OK);
    } catch (error) {
      return Response.failure(res, {
        message: 'an error occured',
        response: error,
      }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Payout();
