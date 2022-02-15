/* eslint-disable consistent-return */
const TransactionService = require('../services/transaction');
const Response = require('../commons/response');
const Constant = require('../commons/constants');
const httpCode = require('../commons/httpCode');
const logger = require('../lib/logger');

class Partner extends TransactionService {
  async totalRevenueForPartner(req, res) {
    let { partnerId } = req.query;
    if (!partnerId) partnerId = req.id;

    let naira = 0;
    let dollar = 0;
    let euro = 0;
    let pounds = 0;

    try {
      const param = {};
      param.conditions = { userId: partnerId };
      const revenue = await this.getAllTransactionsWithCondition(param);

      if (revenue.length > 0) {
        logger.info(revenue);
        return revenue.forEach((e, index, array) => {
          if (e.detail === Constant.NAIRA_TRANSACTION_DETAIL) naira += e.amount;
          if (e.detail === Constant.DOLLAR_TRANSACTION_DETAIL) dollar += e.amount;
          if (e.detail === Constant.EURO_TRANSACTION_DETAIL) euro += e.amount;
          if (e.detail === Constant.POUNDS_TRANSACTION_DETAIL) pounds += e.amount;

          if (index === array.length - 1) {
            return Response.success(res, {
              message: 'successfully processed revenue',
              response: {
                naira,
                dollar,
                euro,
                pounds,
              },
            }, httpCode.OK);
          }
        });
      }
      return Response.success(res, { message: 'no revenue yet' }, httpCode.OK);
    } catch (error) {
      return Response.failure(res, { message: 'a nerror occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Partner();
