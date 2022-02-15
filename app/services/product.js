const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const ProductModel = require('../models/product');

class Product {
  constructor() {
    this.mongoClient = new MongoDBHelper(ProductModel);
  }

  getAllProducts() {
    return this.mongoClient.getBulk();
  }

  getAllPaginatedProducts(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addProduct(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkProduct(param) {
    logger.info('IN-COMING PARAM', param);
    const product = await this.mongoClient.get(param);
    return !!(product !== undefined && product != null);
  }

  async getProduct(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateProduct(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteProduct(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Product;
