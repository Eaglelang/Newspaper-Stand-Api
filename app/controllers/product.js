/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const audit = require('../audits/auditHelper');
const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const ProductSchema = require('../schema/product');
const ProductService = require('../services/product');
const BundleService = require('../services/bundle');
const logger = require('../lib/logger');
const Util = require('../lib/utils');
const Constant = require('../commons/constants');
const { uploadProduct, productCreationFeilds } = require('./helper');

class Product extends ProductService {
  async createProduct(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.PARTNER_ADMIN && req.role !== Constant.SUPER_ADMIN
      && req.role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    uploadProduct(req, res, async (e) => {
      const neededFields = productCreationFeilds;

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

      if (req.role === Constant.PARTNER_ADMIN) {
        req.body.partnerId = req.id;
      }

      const missedFiles = await Util.authenticateParams(req.body, neededFields);
      if (missedFiles.length > 0) {
        // delete the file...
        fs.unlinkSync(path);
        return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.BAD_REQUEST);
      }
      try {
        logger.info('path', req.file);
        fs.readFile(path.toString(), async (err, data) => {
          if (err) {
            return Response.failure(res, { message: 'file not found! unable to read file', response: err }, httpCode.NOT_FOUND);
          }
          try {
            // eslint-disable-next-line max-len
            const imageUrl = await Util.uploadToS3(data, Constant.BUCKET_NAME, req.file.filename);
            logger.info('image url from AWS', imageUrl);
            req.body.image = imageUrl !== undefined ? imageUrl.Location : 'defaultpic.com';
            const product = await this.addProduct(req.body);
            if (product) {
              // delete the file...
              fs.unlinkSync(path);
              const mailPayload = {
                email: 'dev@newspaperstand.com.ng',
                subject: 'Page Suite',
                title: 'Newspaper Stands',
                body: `a new product ${product.productTitle} has been added by a partner`,
              };
              Util.sendMailNotification(mailPayload)
                .then((resp) => {
                  logger.info('successfully sent mail', resp);
                  logger.info('successfully added a new product', product.productTitle);
                  audit.trail('You have successfully added a new product', 'product creation', req.id, product);
                  return Response.success(res, {
                    message: 'successfully added a new product',
                    response: { title: product.productTitle, productType: product.productType },
                  }, httpCode.CREATED);
                }).catch((mailError) => {
                  logger.info(mailError);
                  logger.info('successfully added a new product', product.productTitle);
                  audit.trail('You have successfully added a new product', 'product creation', req.id, product);
                  return Response.success(res, {
                    message: 'successfully added a new product',
                    response: { title: product.productTitle, productType: product.productType },
                  }, httpCode.CREATED);
                });
            }
          } catch (s3Error) {
            // delete the file...
            fs.unlinkSync(path);
            return Response.failure(res, { message: 'an error occured', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
          }
        });
      } catch (err) {
        // delete the file...
        fs.unlinkSync(path);
        logger.info('can\'t create product', err);
        return Response.failure(res, { message: 'unable to create product', response: err }, httpCode.INTERNAL_SERVER_ERROR);
      }
    });
  }

  async getProducts(req, res) {
    const { role } = req;
    logger.info(role);

    let onlyCustomer = false;
    let onlyPartner = false;
    let onlyAdmin = false;

    if (role === Constant.ADMIN || role === Constant.SUPER_ADMIN
      || role === Constant.USER_ADMIN) {
      onlyAdmin = true;
    }

    if (role === Constant.PARTNER_ADMIN || role === Constant.USER) {
      onlyPartner = true;
    }

    if (role === Constant.CUSTOMER_COOP || Constant.CUSTOMER_IND
      || Constant.CUSTOMER_COOP_PARENT || Constant.CUSTOMER_IND_PARENT) {
      onlyCustomer = true;
    }

    const {
      page, sort, limit, productType, partnerId, status, subscription,
    } = req.query;

    if (role === Constant.PARTNER_ADMIN || role === Constant.USER) {
      if (!partnerId) {
        return Response.failure(res, { message: 'your partnerId is required' }, httpCode.BAD_REQUEST);
      }
    }

    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.select = '';

      if (onlyCustomer) {
        params.select = '-productCost -createdAt -updatedAt -partnerId -subscription';
      }

      if (onlyPartner) {
        params.select = '-productPrice';
      }

      if (onlyAdmin) {
        params.select = '';
      }

      params.query = {};

      if (subscription) {
        params.query.subscription = subscription;
      }
      if (productType) {
        params.query.productType = productType;
      }

      if (partnerId) {
        params.query.partnerId = partnerId;
      }
      if (status) {
        params.query.status = status;
      }
      if (req.role === Constant.CUSTOMER_COOP || req.role === Constant.CUSTOMER_IND
        || req.role === Constant.CUSTOMER_COOP_PARENT || req.role === Constant.CUSTOMER_IND_PARENT) {
        params.query.subscription = 'enabled';
      }
      const result = await this.getAllPaginatedProducts(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'product fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no product record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query product collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getProductById(req, res) {
    const { role } = req;
    logger.info(role);

    let onlyCustomer = false;
    let onlyPartner = false;
    let onlyAdmin = false;

    if (role === Constant.ADMIN || role === Constant.SUPER_ADMIN
      || role === Constant.USER_ADMIN) {
      onlyAdmin = true;
    }

    if (role === Constant.PARTNER_ADMIN || role === Constant.USER) {
      onlyPartner = true;
    }

    if (role === Constant.CUSTOMER_COOP || role === Constant.CUSTOMER_IND) {
      onlyCustomer = true;
    }
    const { productId } = req.params;

    if (productId === undefined) {
      return Response.failure(res, { message: 'productId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      if (role === Constant.CUSTOMER_COOP || Constant.CUSTOMER_IND
        || Constant.CUSTOMER_COOP_PARENT || Constant.CUSTOMER_IND_PARENT) {
        param.query = { _id: productId, subscription: 'enabled' };
      }
      param.query = { _id: productId };

      if (onlyAdmin) param.fields = null;
      if (onlyPartner) param.fields = { productPrice: 0 };
      if (onlyCustomer) {
        param.fields = {
          productCost: 0, partnerId: 0, createdAt: 0, updatedAt: 0, subscription: 0,
        };
      }

      const product = await this.getProduct(param);
      logger.info(product);
      if (product) {
        return Response.success(res, {
          message: 'product record successully fetched',
          response: product,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'product not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query product collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async setProductPrice(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const { productId } = req.params;
    if (!productId) {
      Response.failure(res, { message: 'productId is required' }, httpCode.BAD_REQUEST);
      return;
    }
    await ProductSchema.setProductPrice.validateAsync(req.body);

    try {
      req.body.status = 'active';
      const product = await this.updateProduct({ _id: productId }, req.body);
      if (product) {
        audit.trail('You have successfully changed a product status', 'product status change', req.id);
        Response.success(res, { message: 'product price has been set successfully', response: { title: product.productTitle, price: product.productPrice } }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        logger.info(error);
        Response.failure(res, { message: 'productId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      } if (error.msg === 'Record Not Found In DB') {
        logger.info(error);
        Response.failure(res, { message: 'product not found In database' }, httpCode.NOT_FOUND);
        return;
      }
      logger.info(error);
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateProductById(req, res) {
    if (req.role !== Constant.PARTNER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.USER_ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    await ProductSchema.editProduct.validateAsync(req.body);

    const { productId } = req.params;
    try {
      if (!productId) {
        Response.failure(res, { message: 'productId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const product = await this.updateProduct({ _id: productId }, req.body);
      if (product) {
        audit.trail('You have successfully updated a product', 'product update', req.id, product);
        Response.success(res, { message: 'product updated well!!', response: product }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'productId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteProductById(req, res) {
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
      const record = await this.deleteProduct({ _id: id });
      if (record) {
        audit.trail('You have successfully removed a product', 'product creation', req.id);
        Response.success(res, { message: 'record deleted well!!', response: record }, httpCode.OK);
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

  async enableOrDisableSubscription(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN
      && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const { id, type, subscription } = req.query;
    let record;
    let productOrBundle;

    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      if (type !== 'singleProduct' && type !== 'bundle') {
        Response.failure(res, { message: 'type is required and takes either singleProduct or bundle' }, httpCode.BAD_REQUEST);
        return;
      }

      if (subscription !== 'enabled' && subscription !== 'disabled') {
        Response.failure(res, { message: 'subscription is required and takes either enabled or disabled' }, httpCode.BAD_REQUEST);
        return;
      }
      if (type === 'singleProduct') {
        record = await this.getProduct({ _id: id });
      } else {
        record = await new BundleService().getBundle({ _id: id });
      }

      if (!record) {
        Response.failure(res, { message: 'product/bundle not found' }, httpCode.NOT_FOUND);
        return;
      }
      if (record && record.subscription === subscription) {
        Response.failure(res, { message: `product/bundle is already ${subscription}` }, httpCode.BAD_REQUEST);
        return;
      }

      if (type === 'singleProduct') {
        productOrBundle = await this.updateProduct({ _id: id }, { subscription });
      } else {
        productOrBundle = await new BundleService().updateBundle({ _id: id }, { subscription });
      }
      if (productOrBundle) {
        audit.trail(`you have successfully ${subscription} the product/bundle`, 'product sub status', req.id);
        Response.success(res, { message: `you have successfully ${subscription} the product/bundle` }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }
}

module.exports = new Product();
