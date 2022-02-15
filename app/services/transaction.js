const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const TransactionModel = require('../models/transaction');

class Transaction {
  constructor() {
    this.mongoClient = new MongoDBHelper(TransactionModel);
  }

  getAllTransactions() {
    return this.mongoClient.getBulk();
  }

  getAllTransactionsWithCondition(param) {
    return this.mongoClient.getBulk(param);
  }

  getAllPaginatedTransactions(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addTransaction(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkTransaction(param) {
    logger.info('IN-COMING PARAM', param);
    const transaction = await this.mongoClient.get(param);
    return !!(transaction !== undefined && transaction != null);
  }

  getTransaction(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateTransaction(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteTransaction(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Transaction;
