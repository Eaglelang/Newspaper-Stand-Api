/* eslint-disable no-unused-vars */
/* eslint-disable consistent-return */
/**
 * An express Middleware for handling any uncaught exceptions within routes and other middlewares
 * @param req
 * @param res
 * @param next
 */

module.exports = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.send({ statusCode: 400, message: err.message || err });
  }
  if (err.name === 'DocumentNotFoundError') {
    return res.send({ statusCode: 404, message: err.message });
  }
  if (err.name === 'ResponseError') {
    return res.send({ statusCode: 400, message: err.message || err, reason: 'Mongodb Query failed' });
  }

  if (err.name === 'RequestError') {
    return res.send({ statusCode: 400, message: `${err.message}  Call to API failed` });
  }
  res.status(500).send(`${err.stack}`);
};
