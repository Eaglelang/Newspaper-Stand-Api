/* eslint-disable global-require */
/* eslint-disable no-return-await */
const helper = new (require('./elasticHelper'))();
const logger = require('../lib/logger');

const trail = async (message, action, actorId = '', meta = {}) => {
  const payload = {
    service: process.env.APP_NAME || 'audit-trail',
    message,
    action,
    actorId,
    meta,
    timestamp: Date.now(),
  };

  logger.info('Payload to elastic search ', payload.message);

  return helper.create(payload);
};


const customQuery = async (body) => await helper.search(body);

const fetch = async (query, from, size, keyword) => {
  logger.info(keyword);
  const body = { query: { bool: {} } }; let
    must = [];
  must = helper.appendMultiplePropertyMatch(query);
  if (from && size) {
    body.from = from;
    body.size = size;
  }
  body.query.bool = {
    must,
  };

  return await helper.search(body);
};

const deleteIndex = async () => helper.deleteIndex();
module.exports = {
  trail,
  fetch,
  customQuery,
  deleteIndex,
};
