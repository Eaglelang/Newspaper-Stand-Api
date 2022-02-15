/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const SettlementSettingService = require('../services/settlementSetting');
const PartnerService = require('../services/users/partner');
const logger = require('../lib/logger');
const SettlementSettingSchema = require('../schema/settlementSetting');

const Constant = require('../commons/constants');

class SettlementSetting extends SettlementSettingService {
  async addSettlementSetting(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    // validate schema
    await SettlementSettingSchema.createSettlementSetting.validateAsync(req.body);

    const { partnerId } = req.body;
    if (!req.body.createdBy) req.body.createdBy = req.id;

    try {
      const partner = await new PartnerService().checkPartner({ _id: partnerId });
      if (!partner) {
        return Response.failure(res, { message: 'partnerId passed not exists' }, httpCode.NOT_FOUND);
      }

      const record = await this.checkSettlementSetting({ partnerId });
      if (record) {
        return Response.failure(res, { message: `record already exists for partnerId: ${partnerId}` }, httpCode.NOT_ACCEPTABLE);
      }
      const setting = await this.addSettlementSettingRecord(req.body);
      logger.info(setting);
      if (setting) {
        return Response.success(res, {
          message: 'settlementSetting saved successfully',
          response: setting.partnerId,
        }, httpCode.OK);
      }
      return Response.failure(res, {
        message: 'unable to add record, please try again',
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to record settlementSetting', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getSettlementSettings(req, res) {
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
      const result = await this.getAllPaginatedSettlementSettings(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'settlementSetting fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no settlementSetting record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      console.log(error);
      return Response.failure(res, { message: 'unable to query settlementSetting', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getSettlementSettingById(req, res) {
    const { setttlementSettingId } = req.params;

    if (setttlementSettingId === undefined) {
      return Response.failure(res, { message: 'setttlementSettingId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const settlementSetting = await this.getSettlementSetting({ _id: setttlementSettingId });
      logger.info(settlementSetting);
      if (settlementSetting) {
        return Response.success(res, {
          message: 'settlementSetting record successully fetched',
          response: settlementSetting,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'settlementSetting not found' }, httpCode.OK);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'setttlementSettingId passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query settlementSetting collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateSettlementSettingById(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    // validate schema
    await SettlementSettingSchema.editSettlementSetting.validateAsync(req.body);

    const { partnerId } = req.params;
    try {
      if (!partnerId) {
        Response.failure(res, { message: 'partnerId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      // eslint-disable-next-line max-len
      const settlementSetting = await this.updateSettlementSetting({ partnerId }, req.body);
      if (settlementSetting) {
        Response.success(res, { message: 'settlementSetting updated well!!', response: settlementSetting }, httpCode.OK);
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

  async deleteSettlementSettingById(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const { partnerId } = req.params;
    try {
      if (!partnerId) {
        Response.failure(res, { message: 'partnerId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.deleteSettlementSetting({ partnerId });
      if (record.deletedCount === 1) {
        logger.info(record);
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

module.exports = new SettlementSetting();
