const MongoDBHelper = require('..');
const logger = require('../../lib/logger');
const PartnerModel = require('../../models/users/partner');
// const Constant = require('../../commons/constants');

class Partner {
  constructor() {
    this.mongoClient = new MongoDBHelper(PartnerModel);
  }

  getAllPartners() {
    return this.mongoClient.getBulk();
  }

  getPartners(param) {
    return this.mongoClient.getBulk(param);
  }

  getAllPaginatedPartners(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addPartner(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkPartner(param) {
    logger.info('IN-COMING PARAM', param);
    const partner = await this.mongoClient.get(param);
    return !!(partner !== undefined && partner != null);
  }

  getPartner(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updatePartner(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deletePartner(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Partner;
