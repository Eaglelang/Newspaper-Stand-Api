const MongoDBHelper = require('..');
const logger = require('../../lib/logger');
const UserModel = require('../../models/users/user');
const Constant = require('../../commons/constants');

class User {
  constructor() {
    this.mongoClient = new MongoDBHelper(UserModel);
  }

  getAllUsers() {
    return this.mongoClient.getBulk();
  }

  getAllPaginatedUsers(param) {
    logger.info('IN-COMING PARAMS', param);
    return this.mongoClient.getBulkPaginated(param);
  }

  addUser(data) {
    logger.info('IN-COMING DATA', data);
    return this.mongoClient.save(data);
  }

  async checkUser(param) {
    logger.info('IN-COMING PARAM', param);
    const user = await this.mongoClient.get(param);
    return !!(user !== undefined && user != null);
  }

  async checkSuperAdmin(param) {
    logger.info('IN-COMING PARAM', param);
    const admin = await this.mongoClient.get(param);
    if (admin && admin !== null) {
      const { role } = admin;
      if (role && role === Constant.SUPER_ADMIN) return true;
      return false;
    }
    return false;
  }

  getUser(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.get(param);
  }

  updateUser(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.update(param, data);
  }

  deleteUser(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = User;
