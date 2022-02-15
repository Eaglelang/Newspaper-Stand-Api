/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const audit = require('../audits/auditHelper');
const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const CouponSchema = require('../schema/coupon');
const CouponService = require('../services/coupon');
const ProductService = require('../services/product');
const logger = require('../lib/logger');
const Constant = require('../commons/constants');

class Coupon extends CouponService {
  async createCoupon(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const {
      limited, numberAvailable, endDate, expiration, couponCode,
    } = req.body;

    // validate schema
    await CouponSchema.createCoupon.validateAsync(req.body);
    if (limited === true && !numberAvailable) {
      return Response.failure(res, { message: 'numberAvailable is requried' }, httpCode.UNPROCESSED_ENTITY);
    }

    if (expiration === true && !endDate) {
      return Response.failure(res, { message: 'endDate is requried' }, httpCode.UNPROCESSED_ENTITY);
    }

    if (expiration === false && endDate) {
      return Response.failure(res, { message: 'endDate is not requried' }, httpCode.UNPROCESSED_ENTITY);
    }

    if (limited === false && numberAvailable) {
      return Response.failure(res, { message: 'numberAvailable is not requried' }, httpCode.UNPROCESSED_ENTITY);
    }
    try {
      const record = await this.checkCoupon({ couponCode });
      logger.info(record);
      if (record) {
        logger.info('couponCode already exists');
        return Response.failure(res, {
          message: 'couponCode already exists',
        }, httpCode.BAD_REQUEST);
      }
      const coupon = await this.addCoupon(req.body);
      if (coupon) {
        logger.info('successfully created a new coupon', coupon);
        audit.trail('You have successfully created a new coupon', 'coupon creation', req.id, coupon);
        Response.success(res, {
          message: 'successfully created a new coupon',
          response: coupon,
        }, httpCode.CREATED);
      }
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to add coupon', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async isCouponStillAvailableForProduct(productId, couponCode) {
    try {
      const record = await this.getCoupon({ couponCode, forProducts: [productId] });
      if (record) {
        // eslint-disable-next-line no-use-before-define
        const started = await this.hasCouponStarted(record);
        if (!started) {
          logger.info(`coupon has not started yet! starting at ${record.startDate}`);
          return {
            status: false,
            message: `coupon has not started yet! starting at ${record.startDate}`,
          };
        }
        if (record.expiration) {
          // eslint-disable-next-line no-use-before-define
          const status = await this.checkCouponStatus(record);
          if (status && record.count === record.numberAvailable) {
            logger.info('coupon is exhausted');
            return {
              status: false,
              message: 'coupon is exhausted',
            };
          }
          if (status) {
            logger.info('coupon is active');
            return {
              status: true,
              message: 'coupon is active',
            };
          }
          logger.info('coupon has expired');
          return {
            status: false,
            message: 'coupon has expired',
          };
        }
        logger.info('coupon is active! it is unlimited');
        return {
          status: true,
          message: 'coupon is active! it is unlimited',
        };
      }
      logger.info('couponCode passed does not exists or not active for the selected product');
      return {
        status: false,
        message: 'couponCode passed does not exists or not active for the selected product',
      };
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        logger.info('couponCode passed does not exists');
        return {
          status: false,
          message: 'couponCode passed does not exists',
        };
      }
      logger.info(`error occured${error}`);
      return {
        status: false,
        message: `error occured${error}`,
      };
    }
  }

  async checkCouponActiveness(req, res) {
    const { couponCode } = req.params;
    try {
      if (!couponCode) {
        Response.failure(res, { message: 'couponCode is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.getCoupon({ couponCode });
      if (record) {
        // eslint-disable-next-line no-use-before-define
        const started = await this.hasCouponStarted(record);
        if (!started) {
          Response.success(res, { message: `coupon has not started yet! starting at ${record.startDate}` }, httpCode.OK);
          return;
        }
        if (record.expiration) {
          // eslint-disable-next-line no-use-before-define
          const status = await this.checkCouponStatus(record);
          if (status && record.count === record.numberAvailable) {
            Response.success(res, { message: 'coupon is exhausted' }, httpCode.OK);
            return;
          }
          if (status) {
            Response.success(res, { message: 'coupon is active' }, httpCode.OK);
            return;
          }
          Response.success(res, { message: 'coupon has expired' }, httpCode.OK);
          return;
        }
        Response.success(res, { message: 'coupon is active! it is unlimited' }, httpCode.OK);
        return;
      }
      Response.failure(res, { message: 'couponCode passed does not exists' }, httpCode.NOT_FOUND);
      return;
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'couponCode passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: `error occured${error}` }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getCouponValue(couponCode, productId) {
    try {
      const coupon = await this.getCoupon({ couponCode, forProducts: [productId] });
      if (coupon) {
        const product = await new ProductService().getProduct({ _id: productId });
        if (product) {
          if (coupon.discountType === 'percent') {
            const percentInDecimal = coupon.discountValue / 100;
            return percentInDecimal * product.productPrice;
          }
          return coupon.amount;
        }
        return null;
      }
      return null;
    } catch (error) {
      logger.info('error while getting coupon value');
      logger.info(error);
      return null;
    }
  }

  async getCouponBycouponCode(req, res) {
    const { role } = req;
    logger.info(role);

    if (role !== Constant.SUPER_ADMIN && role !== Constant.USER_ADMIN && role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const { couponCode } = req.params;

    if (couponCode === undefined) {
      return Response.failure(res, { message: 'couponCode required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { couponCode };

      const coupon = await this.getCoupon(param);
      logger.info(coupon);
      if (coupon) {
        return Response.success(res, {
          message: 'coupon record successully fetched',
          response: coupon,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'coupon not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query coupon collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCouponByCouponCode(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant delete coupon' }, httpCode.FORBIDDEN);
    }
    const { couponCode } = req.params;
    try {
      if (!couponCode) {
        Response.failure(res, { message: 'couponCode is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.deleteCoupon({ couponCode });
      if (record.deletedCount) {
        logger.info(record);
        audit.trail('You have successfully deleted a coupon', 'coupon deletion', req.id);
        Response.success(res, { message: 'coupon deleted well!!' }, httpCode.DELETED);
        return;
      }
      Response.failure(res, { message: 'couponCode passed does not exists' }, httpCode.NOT_FOUND);
      return;
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'couponCode passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: `error occured${error}` }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCouponByCouponCode(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const {
      limited, numberAvailable, endDate, expiration,
    } = req.body;

    const { couponCode } = req.params;
    try {
      if (!couponCode) {
        Response.failure(res, { message: 'couponCode is required' }, httpCode.BAD_REQUEST);
        return;
      }

      if (limited === true && !numberAvailable) {
        return Response.failure(res, { message: 'numberAvailable is requried when limited is true' }, httpCode.UNPROCESSED_ENTITY);
      }

      if (expiration === true && !endDate) {
        return Response.failure(res, { message: 'endDate is requried when expiration is true' }, httpCode.UNPROCESSED_ENTITY);
      }

      const coupon = await this.updateCoupon({ couponCode }, req.body);
      if (coupon) {
        audit.trail('You have successfully updated a coupon', 'coupon updated', req.id, coupon);
        Response.success(res, { message: 'coupon updated well!!', response: coupon }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'couponCode passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getCoupons(req, res) {
    const { role } = req;
    logger.info(role);

    if (role !== Constant.SUPER_ADMIN && role !== Constant.USER_ADMIN && role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const {
      page, sort, limit, limited, ownerType,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.query = {};
      params.select = '';

      if (limited) {
        params.query.limited = limited;
      }
      if (ownerType) {
        params.query.ownerType = ownerType;
      }
      const result = await this.getAllPaginatedCoupons(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'Coupon fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no Coupon record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query Coupon collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async hasCouponStarted(obj) {
    const toStart = obj.startDate;
    const start = new Date(toStart);
    const currentDate = new Date();
    const difference = start.getTime() - currentDate.getTime();
    logger.info(`difference in secs - ${difference}`);
    if (difference < 0) {
      return true;
    }
    return false;
  }

  async checkCouponStatus(obj) {
    const expiringTime = obj.endDate;
    const endDate = new Date(expiringTime);
    const currentDate = new Date();
    const difference = endDate.getTime() - currentDate.getTime();
    const totalSecond = Math.floor(difference / 1000);
    logger.info(`remainning coupon time in secs - ${totalSecond}`);
    if (totalSecond > 1) {
      return true;
    }
    return false;
  }
}

module.exports = new Coupon();
