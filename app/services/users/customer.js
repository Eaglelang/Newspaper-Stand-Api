/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
const MongoDBHelper = require('..');
const logger = require('../../lib/logger');
const CustomerIndParentModel = require('../../models/users/customer/individual');
const CustomerIndChildModel = require('../../models/users/customer/individualChild');
const CustomerCoopParentModel = require('../../models/users/customer/cooperate');
const CustomerCoopChildModel = require('../../models/users/customer/cooperateChild');
const OtpModel = require('../../models/otp');

class Customer {
  constructor() {
    // Cooperate
    this.mongoClientCoopParent = new MongoDBHelper(CustomerCoopParentModel);
    this.mongoClientCoopChild = new MongoDBHelper(CustomerCoopChildModel);
    // Individual
    this.mongoClientIndParent = new MongoDBHelper(CustomerIndParentModel);
    this.mongoClientIndChild = new MongoDBHelper(CustomerIndChildModel);

    this.mongoClientOtp = new MongoDBHelper(OtpModel);
  }

  // otp palava
  async indexOTP(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientOtp.save(data);
  }

  async timeDifference(date1, date2) {
    const difference = await date1.getTime() - date2.getTime();

    const secondsDifference = Math.floor(difference / 1000);

    logger.info(`difference = ${secondsDifference} second/s`);
    return secondsDifference;
  }

  async verifyOtpAuthenticity(param) {
    logger.info('IN-COMING PARAM', param);
    const otp = await this.mongoClientOtp.get(param);
    logger.info(otp);
    if (otp && otp !== undefined && otp !== null) {
      const otpId = otp._id;
      const createdDate = new Date(otp.createdAt);
      const currentDate = new Date();
      const seconds = await this.timeDifference(currentDate, createdDate);
      logger.info(seconds);
      if (seconds <= 300 && seconds >= 1) {
        await this.mongoClientOtp.deleteOne({ _id: otpId });
        return true;
      }
    }
    return false;
  }

  // Cooperate services
  getAllCustomerCoopParents() {
    return this.mongoClientCoopParent.getBulk();
  }

  getAllCustomerCoopChildren() {
    return this.mongoClientCoopChild.getBulk();
  }

  getAllPaginatedCustomerCoopParent(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClientCoopParent.getBulkPaginated(param);
  }

  getAllPaginatedCustomerCoopChildren(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClientCoopChild.getBulkPaginated(param);
  }

  addCustomerCoopParent(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientCoopParent.save(data);
  }

  addBulkCustomerCoopParent(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientCoopParent.saveBulk(data);
  }

  addCustomerCoopChild(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientCoopChild.save(data);
  }

  addBulkCustomerCoopChild(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientCoopChild.saveBulk(data);
  }

  async checkCustomerCoopParent(param) {
    logger.info('IN-COMING PARAM', param);
    const customer = await this.mongoClientCoopParent.get(param);
    return !!(customer !== undefined && customer != null);
  }

  async checkCustomerCoopChild(param) {
    logger.info('IN-COMING PARAM', param);
    const customer = await this.mongoClientCoopChild.get(param);
    return !!(customer !== undefined && customer != null);
  }

  getCustomerCoopParent(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopParent.get(param);
  }

  getCustomerCoopChild(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopChild.get(param);
  }

  updateCustomerCoopParent(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopParent.update(param, data);
  }

  updateCustomerCoopChild(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopChild.update(param, data);
  }

  deleteCustomerCoopParent(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopParent.deleteOne(param);
  }

  deleteCustomerCoopChild(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopChild.deleteOne(param);
  }

  searchCustomerCoopParent(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientCoopParent.search(param);
  }

  // Individual services
  getAllCustomerIndParents() {
    return this.mongoClientIndParent.getBulk();
  }

  getAllCustomerIndChildren() {
    return this.mongoClientIndChild.getBulk();
  }

  getAllPaginatedCustomerIndParent(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClientIndParent.getBulkPaginated(param);
  }

  getAllPaginatedCustomerIndChildren(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClientIndChild.getBulkPaginated(param);
  }

  addCustomerIndParent(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientIndParent.save(data);
  }

  addBulkCustomerIndParent(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientIndParent.saveBulk(data);
  }

  addCustomerIndChild(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientIndChild.save(data);
  }

  addBulkCustomerIndChild(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientIndChild.saveBulk(data);
  }

  async checkCustomerIndParent(param) {
    logger.info('IN-COMING PARAM', param);
    const customer = await this.mongoClientIndParent.get(param);
    return !!(customer !== undefined && customer != null);
  }

  async checkCustomerIndChild(param) {
    logger.info('IN-COMING PARAM', param);
    const customer = await this.mongoClientIndChild.get(param);
    return !!(customer !== undefined && customer != null);
  }

  getCustomerIndParent(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientIndParent.get(param);
  }

  getCustomerIndChild(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientIndChild.get(param);
  }

  updateCustomerIndParent(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientIndParent.update(param, data);
  }

  updateCustomerIndChild(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientIndChild.update(param, data);
  }

  deleteCustomerIndChild(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientIndChild.deleteOne(param);
  }

  searchCustomerIndParent(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientIndParent.search(param);
  }
}

module.exports = Customer;
