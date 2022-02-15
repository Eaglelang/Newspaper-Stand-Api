/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const audit = require('./auditHelper');
const logger = require('../lib/logger');

class Audit {
  async getAudits(req, res) {
    const {
      page, limit, keyword, actorId,
    } = req.query;
    const query = {
      query: { bool: {} },
      from: setFrom(page) || 0,
      size: limit || 10,
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
    };
    if (keyword) {
      logger.info(`keyword entered: ${keyword}`);
      if (!query.query.bool.must) query.query.bool.must = [];
      query.query.bool.must.push({
        query_string: {
          query: `*${keyword.trim()}*`,
        },
      });
    }

    if (actorId) {
      logger.info(`actorId entered: ${actorId}`);
      if (!query.query.bool.must) query.query.bool.must = [];
      query.query.bool.must.push({
        match: {
          actorId,
        },
      });
    }

    const result = await audit.customQuery(query);
    logger.info(result);
    return Response.success(res, { message: 'audit fetched successfully', response: result }, httpCode.OK);

    function setFrom(pg) {
      if (pg === 1) pg = 0;
      pg = (pg * 10) - 10;
      return pg;
    }
  }

  async deleteIndex(req, res) {
    const result = await audit.deleteIndex();
    logger.info(result);
    if (result) return Response.success(res, { message: 'index deleted', response: result }, httpCode.OK);
    return Response.failure(res, { message: 'unable to delete index' }, httpCode.INTERNAL_SERVER_ERROR);
  }
}

module.exports = new Audit();
