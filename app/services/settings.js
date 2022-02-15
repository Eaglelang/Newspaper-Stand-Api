const MongoDBHelper = require('.');
const logger = require('../lib/logger');
const SettingModel = require('../models/settings');

class Setting {
  constructor() {
    this.mongoClient = new MongoDBHelper(SettingModel);
  }

  async findOrCreateSetting(data) {
    logger.info('IN-COMING DATA', data);
    const setting = await this.mongoClient.get(data);
    if (!setting) return this.mongoClient.save(data);
    return true;
  }

  getSetting(param) {
    return this.mongoClient.get(param);
  }

  getAllSettings() {
    return this.mongoClient.getBulk();
  }

  updateSetting(param, data) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.updateOrCreate(param, data);
  }

  deleteSetting(param) {
    logger.info('IN-COMING PARAM', param);
    return this.mongoClient.deleteOne(param);
  }
}

module.exports = Setting;
