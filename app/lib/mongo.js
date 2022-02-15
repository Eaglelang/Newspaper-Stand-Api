/* eslint-disable no-undef */
const mongoose = require('mongoose');
const logger = require('./logger');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info('mongodb connected');
  }).catch((error) => {
    logger.info('mongodb not connected', error);
  });

module.exports = mongoose;
