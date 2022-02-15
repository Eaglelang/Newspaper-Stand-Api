/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
const MongoDBHelper = require('..');
const logger = require('../../lib/logger');

const WalletModel = require('../../models/users/customer/wallet');
const tnsWalletModel = require('../../models/users/customer/tnsWallet');
const partnerWalletModel = require('../../models/users/customer/partnerWallet');


class Wallet {
  constructor() {
    this.mongoClientWallet = new MongoDBHelper(WalletModel);
    this.mongoClientTnsWallet = new MongoDBHelper(tnsWalletModel);
    this.mongoClientPartnerWallet = new MongoDBHelper(partnerWalletModel);
  }

  async addCustomerWallet(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientWallet.save(data);
  }

  async getCustomerWallet(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientWallet.get(param);
  }

  async checkWallet(param) {
    logger.info('IN-COMING PARAM', param);
    const wallet = await this.mongoClientWallet.get(param);
    return !!(wallet !== undefined && wallet != null);
  }

  updateWallet(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientWallet.update(param, data);
  }

  // tns waalet
  async addTNSWallet(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientTnsWallet.save(data);
  }

  async getTNSWallet(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientTnsWallet.get(param);
  }

  updateTNSWallet(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientTnsWallet.update(param, data);
  }

  // partner wallet
  async addPartnerWallet(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClientPartnerWallet.save(data);
  }

  async getPartnerWallet(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientPartnerWallet.get(param);
  }

  async getPartnerWallets(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientPartnerWallet.getBulk(param);
  }

  updatePartnerWallet(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClientPartnerWallet.update(param, data);
  }
}

module.exports = Wallet;
