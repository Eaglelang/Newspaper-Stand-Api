/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const BundleService = require('../services/bundle');
const logger = require('../lib/logger');
const Constant = require('../commons/constants');
const Util = require('../lib/utils');
const { uploadProduct, bundleCreationFeilds } = require('./helper');

const uploadBundle = uploadProduct;

class Bundle extends BundleService {
  async createBundle(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    uploadBundle(req, res, async (e) => {
      const neededFields = bundleCreationFeilds;

      if (req.fileValidationError) {
        return Response.failure(res, { message: 'incorrect file type', response: req.fileValidationError }, httpCode.BAD_REQUEST);
      }
      if (!req.file) {
        return Response.failure(res, { message: 'please select an image to upload' }, httpCode.BAD_REQUEST);
      }
      if (e) {
        return Response.failure(res, { message: 'error uploading image', response: e }, httpCode.BAD_REQUEST);
      }

      const { path } = req.file;
      req.body.creatorId = req.id;

      const missedFiles = await Util.authenticateParams(req.body, neededFields);
      if (missedFiles.length > 0) {
        fs.unlinkSync(path);
        return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.BAD_REQUEST);
      }
      try {
        logger.info('path', req.file);
        fs.readFile(path.toString(), async (err, data) => {
          if (err) {
            logger.info(err);
            return Response.failure(res, { message: 'file not found! unable to read file', response: err }, httpCode.NOT_FOUND);
          }
          try {
            const imageUrl = await Util.uploadToS3(data, Constant.BUCKET_NAME, req.file.filename);
            logger.info('image url from AWS', imageUrl);
            req.body.image = imageUrl !== undefined ? imageUrl.Location : 'nill';
            const bundle = await this.addBundle(req.body);
            if (bundle) {
              fs.unlinkSync(path);
              logger.info('successfully added a new bundle', bundle.bundleName);
              Response.success(res, {
                message: 'successfully added a new bundle',
                response: { name: bundle.bundleName, priceOfBundle: bundle.priceOfBundle },
              }, httpCode.CREATED);
            }
          } catch (s3OrsavingError) {
            fs.unlinkSync(path);
            logger.info('can\'t create bundle', s3OrsavingError);
            return Response.failure(res, { message: 'unable to create bundle', response: s3OrsavingError }, httpCode.INTERNAL_SERVER_ERROR);
          }
        });
      } catch (error) {
        fs.unlinkSync(path);
        logger.info('can\'t create bundle', error);
        return Response.failure(res, { message: 'an error occoured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
      }
    });
  }

  async getBundles(req, res) {
    const { role } = req;
    const {
      page, sort, limit, creatorId, status, subscription,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };
      params.query = {};
      params.select = '';

      if (creatorId) {
        params.query.creatorId = creatorId;
      }
      if (status) {
        params.query.status = status;
      }
      if (subscription) {
        params.query.subscription = subscription;
      }
      if (req.role === Constant.CUSTOMER_COOP_CHILD || req.role === Constant.CUSTOMER_IND_CHILD
        || req.role === Constant.CUSTOMER_COOP_PARENT || req.role === Constant.CUSTOMER_IND_PARENT) {
        params.query.subscription = 'enabled';
      }
      const result = await this.getAllPaginatedBundles(params);
      if (result.docs.length > 0) {
        if (role === Constant.CUSTOMER_IND || role === Constant.CUSTOMER_COOP) {
          const resp = result.docs.map((element) => ({
            status: element.status,
            priceOfBundle: element.priceOfBundle,
            bundleName: element.bundleName,
            numberOfProduct: element.numberOfProduct,
            numberOfNewspaper: element.numberOfNewspaper,
            numberOfMagazine: element.numberOfMagazine,
            bundleId: element.bundleId,
            image: element.image,
          }));
          return Response.success(res, {
            message: 'bundle fetched successfully',
            response: resp,
          }, httpCode.OK);
        }
        return Response.success(res, {
          message: 'bundle fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no bundle record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query bundle collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getBundleById(req, res) {
    const { role } = req;
    logger.info(role);
    const { bundleId } = req.params;

    if (bundleId === undefined) {
      return Response.failure(res, { message: 'bundleId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: bundleId };
      if (role === Constant.CUSTOMER_COOP_CHILD || Constant.CUSTOMER_IND_CHILD
        || Constant.CUSTOMER_COOP_PARENT || Constant.CUSTOMER_IND_PARENT) {
        param.query = { _id: bundleId, subscription: 'enabled' };
      }

      const bundle = await this.getBundle(param);
      logger.info(bundle);
      if (bundle) {
        if (role === Constant.CUSTOMER_IND || role === Constant.CUSTOMER_COOP) {
          const resp = {
            status: bundle.status,
            priceOfBundle: bundle.priceOfBundle,
            bundleName: bundle.bundleName,
            numberOfProduct: bundle.numberOfProduct,
            numberOfNewspaper: bundle.numberOfNewspaper,
            numberOfMagazine: bundle.numberOfMagazine,
            bundleId: bundle.bundleId,
            image: bundle.image,
          };
          return Response.success(res, {
            message: 'bundle record successully fetched',
            response: resp,
          }, httpCode.OK);
        }
        return Response.success(res, {
          message: 'bundle record successully fetched',
          response: bundle,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'bundle not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query bundle collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateBundleById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const { bundleId } = req.params;
    try {
      if (!bundleId) {
        Response.failure(res, { message: 'bundleId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const bundle = await this.updateBundle({ _id: bundleId }, req.body);
      if (bundle) {
        Response.success(res, { message: 'bundle updated well!!', response: bundle }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'bundleId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteBundleById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const { id } = req.params;
    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.deleteBundle({ _id: id });
      if (record.deletedCount) {
        Response.success(res, { message: 'record deleted well!!' }, httpCode.DELETED);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: `error occured${error}` }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Bundle();
