/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const TransactionService = require('../services/transaction');
const logger = require('../lib/logger');
const { excelTransactionHelper } = require('./excelHelper');
const Constant = require('../commons/constants');

class Transaction extends TransactionService {
  async createTransaction(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    try {
      const transaction = await this.addTransaction(req.body);
      if (transaction) {
        logger.info('successfully saved a new transaction', transaction.transactionTitle);
        Response.success(res, {
          message: 'successfully added a new transaction',
          response: { name: transaction.transactionTitle },
        }, httpCode.CREATED);
      }
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to save transaction', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  // download transaction file (csv) of a range
  async downloadTransactionReport(req, res) {
    const {
      from, to, userId,
    } = req.query;
    logger.info(req.role);
    const filename = `transaction${Date.now()}.xlsx`;
    const file = `${__dirname}/${filename}`;
    // this prevents other users from downloading all the transactions accross different users
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      if (!userId) return Response.failure(res, { message: 'forbidden! userId is required' }, httpCode.FORBIDDEN);
    }
    // check that date is not empty
    if (!from || !to) {
      return Response.failure(res, { message: 'specify from and to dates' }, httpCode.BAD_REQUEST);
    }
    try {
      logger.info(`${from} - ${to}`);
      const params = {};
      params.conditions = {
        createdAt: {
          $gte: new Date(new Date(from).setHours(0, 0, 0)),
          $lt: new Date(new Date(to).setHours(23, 59, 59)),
        },
      };
      if (userId) params.conditions.userId = userId;
      const result = await this.getAllTransactionsWithCondition(params);
      if (result.length > 0) {
        await excelTransactionHelper(result, filename);
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const filestream = fs.createReadStream(file);
        filestream.pipe(res);
        // delete the file after dowloading
        fs.unlinkSync(file);
        return;
      }
      return Response.success(res, {
        message: 'no transaction record available',
        response: [],
      }, httpCode.RESET_CONTENT);
    } catch (error) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      console.log(error);
      return Response.failure(res, { message: 'unable to query transaction collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransactions(req, res) {
    const {
      page, sort, limit, userId, status,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.query = {};
      params.select = '';

      if (userId) {
        params.query.userId = userId;
      }
      if (status) {
        params.query.status = status;
      }
      const result = await this.getAllPaginatedTransactions(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'transaction fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no transaction record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query transaction collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransactionById(req, res) {
    const { transactionId } = req.params;

    if (transactionId === undefined) {
      return Response.failure(res, { message: 'transactionId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: transactionId };

      const transaction = await this.getTransaction(param);
      logger.info(transaction);
      if (transaction) {
        return Response.success(res, {
          message: 'transaction record successully fetched',
          response: transaction,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'transaction not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query transaction collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateTransactionById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const { transactionId } = req.params;
    try {
      if (!transactionId) {
        Response.failure(res, { message: 'transactionId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const transaction = await this.updateTransaction({ _id: transactionId }, req.body);
      if (transaction) {
        Response.success(res, { message: 'transaction updated well!!', response: transaction }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'transactionId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteTransactionById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const { id } = req.params;
    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.deleteTransaction({ _id: id });
      if (record) {
        Response.success(res, { message: 'record deleted well!!' }, httpCode.DELETED);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: `error occured${error}` }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Transaction();
