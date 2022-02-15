/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const audit = require('../audits/auditHelper');
const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const PartnerBankService = require('../services/partnerBank');
const logger = require('../lib/logger');

class PartnerBank extends PartnerBankService {
  async addPartnerBank(req, res) {
    const { bank, accountName, accountNumber } = req.body;

    if (!bank || !accountName || !accountNumber) {
      return Response.failure(res, { message: 'bank, accountName, accountNumber are missing' }, httpCode.BAD_REQUEST);
    }

    if (!req.body.partnerId) req.body.partnerId = req.id;

    try {
      const record = await this.checkPartnerBank({ partnerId: req.id });
      if (record) {
        return Response.failure(res, { message: 'you have already added bank information' }, httpCode.NOT_ACCEPTABLE);
      }

      const partnerBank = await this.addPartnerBankRecord(req.body);
      if (partnerBank) {
        logger.info('successfully added partnerBank information');
        audit.trail('You have successfully added your bank detail', 'bank detail added', req.id, partnerBank);
        Response.success(res, {
          message: 'successfully added a new partnerBank information',
          response: partnerBank.partnerId,
        }, httpCode.CREATED);
      }
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to add partnerBank information', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPartnerBanks(req, res) {
    const { id } = req;
    logger.info(id);

    const {
      page, sort, limit, bank,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };
      params.query = {};

      if (bank) {
        params.query.bank = bank;
      }
      const result = await this.getAllPaginatedPartnerBanks(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'partnerBank information fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no partnerBank record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query partnerBank collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPartnerBankById(req, res) {
    const { partnerId } = req.params;

    if (partnerId === undefined) {
      return Response.failure(res, { message: 'partnerId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { partnerId };

      const partnerBank = await this.getPartnerBank(param);
      logger.info(partnerBank);
      if (partnerBank) {
        return Response.success(res, {
          message: 'partnerBank record successully fetched',
          response: partnerBank,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'partnerBank not found' }, httpCode.OK);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'partnerId passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query partnerBank collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePartnerBankById(req, res) {
    const { partnerId } = req.params;
    try {
      if (!partnerId) {
        Response.failure(res, { message: 'partnerId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const partnerBank = await this.updatePartnerBank({ partnerId }, req.body);
      if (partnerBank) {
        audit.trail('You have successfully updated your bank detail', 'bank detail updated', partnerId);
        Response.success(res, { message: 'partnerBank updated well!!', response: PartnerBank }, httpCode.OK);
        return;
      }
    } catch (error) {
      logger.info(error);
      if (error.msg === 'CastError') {
        Response.failure(res, { message: 'partnerId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePartnerBankById(req, res) {
    const { partnerId } = req.params;
    try {
      if (!partnerId) {
        Response.failure(res, { message: 'partnerId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.deletePartnerBank({ partnerId });
      if (record.deletedCount === 1) {
        logger.info(record);
        audit.trail('You have successfully deleted a bank detail', 'bank detail updated', partnerId);
        Response.success(res, { message: 'record deleted well!!' }, httpCode.OK);
        return;
      }
      Response.failure(res, { message: 'record not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'partnerId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: `error occured${error}` }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new PartnerBank();
