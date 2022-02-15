const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const BundleModel = require('../models/bundle');

class Bundle {
  constructor() {
    this.mongoClient = new MongoDBHelper(BundleModel);
  }

  getAllBundles() {
    return this.mongoClient.getBulk();
  }

  getAllPaginatedBundles(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addBundle(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkBundle(param) {
    logger.info('IN-COMING PARAM', param);
    const bundle = await this.mongoClient.get(param);
    return !!(bundle !== undefined && bundle != null);
  }

  getBundle(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateBundle(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteBundle(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Bundle;
