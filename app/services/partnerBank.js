const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const PartnerBankModel = require('../models/partnerBank');

class PartnerBank {
  constructor() {
    this.mongoClient = new MongoDBHelper(PartnerBankModel);
  }

  getAllPartnerBanks() {
    return this.mongoClient.getBulk();
  }

  getAllPaginatedPartnerBanks(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addPartnerBankRecord(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkPartnerBank(param) {
    logger.info('IN-COMING PARAM', param);
    const partnerBank = await this.mongoClient.get(param);
    return !!(partnerBank !== undefined && partnerBank != null);
  }

  getPartnerBank(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updatePartnerBank(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deletePartnerBank(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = PartnerBank;
