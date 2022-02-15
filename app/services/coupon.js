const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const CouponModel = require('../models/coupon');

class Coupon {
  constructor() {
    this.mongoClient = new MongoDBHelper(CouponModel);
  }

  getAllCoupons() {
    return this.mongoClient.getBulk();
  }

  getAllPaginatedCoupons(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addCoupon(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkCoupon(param) {
    logger.info('IN-COMING PARAM', param);
    const coupon = await this.mongoClient.get(param);
    return !!(coupon !== undefined && coupon != null);
  }

  getCoupon(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateCoupon(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  incrementCouponCount(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.increment(param, data);
  }

  deleteCoupon(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Coupon;
