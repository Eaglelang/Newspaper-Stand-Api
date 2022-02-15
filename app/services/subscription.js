const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const SubscriptionModel = require('../models/subscription');
const DurationModel = require('../models/duration');

class Subscription {
  constructor() {
    this.mongoClient = new MongoDBHelper(SubscriptionModel);
    this.mongoClientDuration = new MongoDBHelper(DurationModel);
  }

  getAllSubscriptions() {
    return this.mongoClient.getBulk();
  }

  getAllSubscriptionsWithCondition(param) {
    return this.mongoClient.getBulk(param);
  }

  getAllPaginatedSubscriptions(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  getSpecificSubscription(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getRange(param);
  }

  addSubscription(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkSubscription(param) {
    logger.info('IN-COMING PARAM', param);
    const subscription = await this.mongoClient.get(param);
    return !!(subscription !== undefined && subscription != null);
  }

  getSubscription(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateSubscription(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteSubscription(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }

  // Duration services!!!!!!!!
  addDuration(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientDuration.save(data);
  }

  getDuration(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientDuration.get(param);
  }

  getDurations() {
    return this.mongoClientDuration.getBulk();
  }

  updateDuration(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientDuration.update(param, data);
  }

  deleteDuration(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientDuration.deleteOne(param);
  }
}

module.exports = Subscription;
