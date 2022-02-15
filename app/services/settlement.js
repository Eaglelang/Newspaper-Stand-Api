const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const SettlementModel = require('../models/settlement');

class Settlement {
  constructor() {
    this.mongoClient = new MongoDBHelper(SettlementModel);
  }

  getAllSettlements() {
    return this.mongoClient.getBulk();
  }

  getAllSettlementWithCondition(param) {
    return this.mongoClient.getBulk(param);
  }

  getAllPaginatedSettlements(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addSettlementRecord(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkSettlement(param) {
    logger.info('IN-COMING PARAM', param);
    const settlement = await this.mongoClient.get(param);
    return !!(settlement !== undefined && settlement != null);
  }

  getSettlement(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateSettlement(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteSettlement(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Settlement;
