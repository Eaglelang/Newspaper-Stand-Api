const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const SettlementSettingModel = require('../models/settlementSetting');

class SettlementSetting {
  constructor() {
    this.mongoClient = new MongoDBHelper(SettlementSettingModel);
  }

  getAllSettlementSettings() {
    return this.mongoClient.getBulk();
  }

  getAllPaginatedSettlementSettings(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addSettlementSettingRecord(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkSettlementSetting(param) {
    logger.info('IN-COMING PARAM', param);
    const settlementSetting = await this.mongoClient.get(param);
    return !!(settlementSetting !== undefined && settlementSetting != null);
  }

  getSettlementSetting(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateSettlementSetting(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteSettlementSetting(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = SettlementSetting;
