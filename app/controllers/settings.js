const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const audit = require('../audits/auditHelper');
const Constant = require('../commons/constants');
const SettingsService = require('../services/settings');
const logger = require('../lib/logger');

class Settings extends SettingsService {
  async setMinimumAmountToFundWith(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    if (!req.body.walletMinimumAmount) {
      return Response.failure(res, { message: ' walletMinimumAmount is required' }, httpCode.BAD_REQUEST);
    }

    if (typeof req.body.walletMinimumAmount !== 'number') {
      return Response.failure(res, { message: ' walletMinimumAmount must be of type number' }, httpCode.BAD_REQUEST);
    }
    try {
      const minWalletAmount = {
        settingId: Constant.SETTING_ID,
      };
      const data = {
        walletMinimumAmount: req.body.walletMinimumAmount,
      };
      const updatedData = await this.updateSetting(minWalletAmount, data);
      logger.info(updatedData);
      await audit.trail('Admin set the minimum amount a wallet can fund with', 'Wallet Minimum Amount Setting', req.id);
      return Response.success(res, { message: 'successfully set the amount' }, httpCode.OK);
    } catch (error) {
      return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getMinAmount() {
    const amount = await this.getSetting({ settingId: Constant.SETTING_ID }).walletMinimumAmount;
    return amount;
  }

  async getSettings(req, res) {
    try {
      return Response.success(res, { message: 'fetched', response: await this.getAllSettings() }, httpCode.OK);
    } catch (error) {
      return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Settings();
