/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const shortid = require('shortid');
const audit = require('../audits/auditHelper');
const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const SettlementService = require('../services/settlement');
const WalletService = require('../services/users/wallet');
const logger = require('../lib/logger');
const TransactionService = require('../services/transaction');
const SettlementSchema = require('../schema/settlement');
const Constant = require('../commons/constants');

class Settlement extends SettlementService {
  async addSettlement(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const {
      partnerId, bankTransactionId, currencyCode, amount,
    } = req.body;

    let updatedWallet;
    let data = {};
    let unitLeft;

    // validate schema
    await SettlementSchema.createSettlement.validateAsync(req.body);

    if (!req.body.issuerId) req.body.issuerId = req.id;

    try {
      const record = await this.checkSettlement({ bankTransactionId });
      if (record) {
        return Response.failure(res, { message: 'duplicate bankTransactionId: transaction already recorded' }, httpCode.NOT_ACCEPTABLE);
      }
      const param = { userId: partnerId };
      const wallet = await new WalletService().getPartnerWallet(param);
      if (!wallet) {
        return Response.failure(res, { message: 'wallet not found for the partner' }, httpCode.NOT_FOUND);
      }
      const params = { userId: partnerId };
      // deduct the amount paid from partner's wallet
      switch (currencyCode) {
        case 'NGN':
          unitLeft = wallet.nairaBalance - amount;
          data = { nairaBalance: unitLeft };
          updatedWallet = await new WalletService().updatePartnerWallet(params, data);
          break;
        case 'USD':
          unitLeft = wallet.dollarBalance - amount;
          data = { dollarBalance: unitLeft };
          updatedWallet = await new WalletService().updatePartnerWallet(params, data);
          break;
        case 'EUR':
          unitLeft = wallet.euroBalance - amount;
          data = { euroBalance: unitLeft };
          updatedWallet = await new WalletService().updatePartnerWallet(params, data);
          break;
        case 'GBP':
          unitLeft = wallet.poundsBalance - amount;
          data = { poundsBalance: unitLeft };
          updatedWallet = await new WalletService().updatePartnerWallet(params, data);
          break;
        default:
          return;
      }
      if (updatedWallet) {
        logger.info(updatedWallet);
        const settlement = await this.addSettlementRecord(req.body);
        if (settlement) {
          const transaction = {
            status: 'success',
            amount,
            transactionId: shortid.generate(),
            transactionTitle: 'settlement recording',
            detail: `An amount of ${amount} ${currencyCode} was recorded`,
            side: 'credit',
            userId: partnerId,
          };
          const savedResponse = await new TransactionService().addTransaction(transaction);
          logger.info(savedResponse);
          logger.info(settlement);
          logger.info('successfully recorded settlement');
          audit.trail('You have successfully settled a partner', 'partner settlement', req.id, settlement);
          Response.success(res, {
            message: 'successfully recorded settlement',
            response: settlement.partnerId,
          }, httpCode.CREATED);
        }
      }
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to record settlement', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getSettlements(req, res) {
    const {
      page, sort, limit, partnerId,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };
      params.query = {};
      if (partnerId) {
        params.query.partnerId = partnerId;
      }
      const result = await this.getAllPaginatedSettlements(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'settlement fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no settlement record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      console.log(error);
      return Response.failure(res, { message: 'unable to query settlement', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getAggregatedSettlementAmount(req, res) {
    try {
      let naira = 0; let pounds = 0; let dollar = 0;
      let euro = 0;
      const results = await this.getAllSettlements();
      if (results.length > 0) {
        // eslint-disable-next-line array-callback-return
        results.map((result) => {
          switch (result.currencyCode) {
            case 'NGN':
              naira += result.amount;
              break;
            case 'USD':
              dollar += result.amount;
              break;
            case 'EUR':
              euro += result.amount;
              break;
            case 'GBP':
              pounds += result.amount;
              break;
            default:
              logger.info('nothing type');
          }
        });
        return Response.success(res, {
          message: 'aggregation fetched successfully',
          response: {
            naira, dollar, euro, pounds,
          },
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no aggregation record',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      console.log(error);
      return Response.failure(res, { message: 'unable to query settlement', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getSettlementById(req, res) {
    const { setttlementId } = req.params;

    if (setttlementId === undefined) {
      return Response.failure(res, { message: 'setttlementId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const settlement = await this.getSettlement({ _id: setttlementId });
      logger.info(settlement);
      if (settlement) {
        return Response.success(res, {
          message: 'settlement record successully fetched',
          response: settlement,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'settlement not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'setttlementId passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query settlement collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateSettlementById(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    // validate schema
    await SettlementSchema.editSettlement.validateAsync(req.body);

    const { setttlementId } = req.params;
    try {
      if (!setttlementId) {
        Response.failure(res, { message: 'setttlementId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const settlement = await this.updateSettlement({ _id: setttlementId }, req.body);
      if (settlement) {
        audit.trail('You have successfully updated a settlement', 'partner settlement updated', req.id, settlement);
        Response.success(res, { message: 'settlement updated well!!', response: settlement }, httpCode.OK);
        return;
      }
    } catch (error) {
      logger.info(error);
      if (error.msg === 'CastError') {
        Response.failure(res, { message: 'setttlementId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteSettlementById(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const { setttlementId } = req.params;
    try {
      if (!setttlementId) {
        Response.failure(res, { message: 'setttlementId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.deleteSettlement({ _id: setttlementId });
      if (record.deletedCount === 1) {
        logger.info(record);
        audit.trail('You have successfully deleted a settlement', 'partner settlement deleted', req.id);
        Response.success(res, { message: 'record deleted well!!' }, httpCode.OK);
        return;
      }
      Response.failure(res, { message: 'record not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'setttlementId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: `error occured${error}` }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Settlement();
