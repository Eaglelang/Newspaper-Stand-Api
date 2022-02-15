/* eslint-disable consistent-return */
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');
const Response = require('../commons/response');
const httpStatus = require('../commons/httpCode');

module.exports = (req, res, next) => {
  try {
    let tokenPassed = req.headers['x-access-token'] || req.headers.authorization || req.body.token;
    if (!tokenPassed || tokenPassed === undefined) {
      return Response.failure(res, { message: 'Access denied! No token provided.' }, httpStatus.UNAUTHORIZED);
    }
    tokenPassed = tokenPassed.split(' ');
    const [, token] = tokenPassed;
    if (token === undefined || token.length <= 0) {
      return Response.failure(res, { message: 'Access denied! No token provided.' }, httpStatus.UNAUTHORIZED);
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('decoded data - ', decodedData);
    req.id = decodedData.id;
    req.role = decodedData.role;
    next();
  } catch (error) {
    return Response.failure(res, { message: 'Invalid token passed' }, httpStatus.UNAUTHORIZED);
  }
};
