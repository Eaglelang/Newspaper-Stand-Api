/* eslint-disable class-methods-use-this */
/* eslint-disable no-undef */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailTemp = require('../../../../commons/email');
const Util = require('../../../../lib/utils');
const Response = require('../../../../commons/response');
const httpCode = require('../../../../commons/httpCode');
const CustomerService = require('../../../../services/users/customer');
const logger = require('../../../../lib/logger');
const Constant = require('../../../../commons/constants');
const { upload, indChildfields } = require('../../../helper');

class Customer extends CustomerService {
  // !!!!!! customer signs up !!!!!!!
  async createIndividualChild(req, res) {
    logger.info(req.body);
    let isFile = false;
    upload(req, res, async (e) => {
      if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN) {
        if (!this.checkCustomerIndParent({ _id: req.id })) {
          return Response.failure(res, { message: 'error! you don\'t have access to this resource' }, httpCode.FORBIDDEN);
        }
      }
      const neededFields = indChildfields;

      if (req.fileValidationError) {
        return Response.failure(res, { message: 'incorrect file type', response: req.fileValidationError }, httpCode.BAD_REQUEST);
      }

      if (req.file) {
        isFile = true;
      }


      if (e) {
        return Response.failure(res, { message: 'error uploading image', response: e }, httpCode.BAD_REQUEST);
      }

      const missedFiles = await Util.authenticateParams(req.body, neededFields);

      if (missedFiles.length > 0) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
      }

      const path = req.file !== undefined ? req.file.path : '';
      const email = req.body.email.toLowerCase();
      try {
        const record = await this.checkCustomerCoopChild({ email });
        logger.info(record);
        if (record) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'email already exists' }, httpCode.BAD_REQUEST);
        }

        const isPhoneNumber = await this.checkCustomerCoopChild({ phoneNumber: req.body.phoneNumber });

        if (isPhoneNumber) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'record already exists with the phoneNumber' }, httpCode.BAD_REQUEST);
        }
        try {
          const hashedPassword = await Util.hashPassword(req.body.password);
          req.body.password = hashedPassword;
          try {
            logger.info('path', req.file);
            fs.readFile(path.toString(), async (err, data) => {
              if (err) {
                logger.info('image is not uploaded');
                logger.info(err);
              }
              try {
                // eslint-disable-next-line max-len
                const imageUrl = isFile === true ? await Util.uploadToS3(data, Constant.BUCKET_NAME, req.file.filename) : '';
                logger.info('image url from AWS', imageUrl);
                if (imageUrl !== '') {
                  req.body.profilePic = imageUrl.Location;
                }
                req.body.parentCustomerId = req.id;
                req.body.email = req.body.email.toLowerCase();
                const user = await this.addCustomerIndChild(req.body);
                if (user) {
                  if (req.file) {
                    fs.unlinkSync(path);
                  }
                  const mailPayload = {
                    email,
                    subject: 'Page Suite',
                    title: 'Newspaper Stands',
                    body: 'Welcome to Newspaper Stands. We\'re glad that you\'ve joined millions of daily readers\nYour sub-account has been created by %s',
                  };
                  Util.sendMailNotification(mailPayload)
                    .then((resp) => {
                      logger.info('successfully sent mail', resp);
                      logger.info('successfully created a new record', user.role);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user._id },
                      }, httpCode.CREATED);
                      // notify the partner via mail and to change his password
                    }).catch((mailError) => {
                      logger.info(mailError);
                      logger.info('successfully created a new record but email not sent', user);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user._id },
                      }, httpCode.CREATED);
                      // notify the partner via mail and to change his password
                    });
                }
              } catch (s3Error) {
                if (req.file) {
                  fs.unlinkSync(path);
                }
                return Response.failure(res, { message: 'error while uploading to s3', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
              }
            });
          } catch (err) {
            if (req.file) {
              fs.unlinkSync(path);
            }
            logger.info('can\'t create user', err);
            return Response.failure(res, { message: 'unable to create a new user', response: err }, httpCode.INTERNAL_SERVER_ERROR);
          }
        } catch (error) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          logger.info(error);
          return Response.failure(res, { message: 'unable to hash password', data: error }, httpCode.INTERNAL_SERVER_ERROR);
        }
      } catch (error) {
        if (req.file) {
          fs.unlinkSync(path);
        }
        logger.info(error);
        return Response.failure(res, { message: 'unable to check db by email', response: error }, httpCode.INTERNAL_SERVER_ERROR);
      }
    });
  }

  // !!!! get customer by id !!!!!!
  async getCustomerIndChildById(req, res) {
    const { id } = req.params;

    if (id === undefined) {
      return Response.failure(res, { message: 'id required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: id };
      param.fields = {
        parentCustomerId: 0, status: 0, isTrial: 0, verified: 0, password: 0,
      };
      const customer = await this.getCustomerIndChild(param);
      if (customer) {
        return Response.success(res, {
          message: 'customer record successully fetched',
          response: customer,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'customer not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query customer collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getIndividualChildrenCustomer(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.CUSTOMER_IND_PARENT
      && req.role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const {
      page, sort, limit, status, parentCustomerId,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.query = {};
      params.select = '';

      if (parentCustomerId) {
        params.query.parentCustomerId = parentCustomerId;
      }
      if (status) {
        params.query.status = status;
      }
      const result = await this.getAllPaginatedCustomerIndChildren(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'customer fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no users customer available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query customer collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateIndividualChildById(req, res) {
    const { id } = req.params;
    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.updateCustomerIndChild({ _id: id }, req.body);
      if (record) {
        delete record.password;
        delete record.status;
        delete record.isTrial;
        delete record.verified;
        Response.success(res, { message: 'record updated well!!', response: record }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async changePassword(req, res) {
    const {
      oldPassword, newPassword, confirmPassword,
    } = req.body;

    const missedFiles = await Util.authenticateParams(req.body, ['oldPassword', 'newPassword', 'confirmPassword']);
    if (missedFiles.length > 0) {
      return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
    }
    try {
      const record = await this.getCustomerIndChild({ _id: req.id });
      if (!record) {
        Response.failure(res, { message: 'record is not found' }, httpCode.NOT_FOUND);
        return;
      }
      if (newPassword !== confirmPassword) {
        Response.failure(res, { message: 'Password does not match' }, httpCode.BAD_REQUEST);
        return;
      }
      const bodyToUpdate = {
        password: await Util.hashPassword(req.body.newPassword),
      };
      const isPassordCorrect = await bcrypt.compareSync(oldPassword, record.password);
      if (isPassordCorrect) {
        const updatedRecord = await this.updateCustomerIndChild({ _id: req.id }, bodyToUpdate);
        if (updatedRecord) {
          Response.success(res, { message: 'You have successfully changed your password' }, httpCode.OK);
          return;
        }
      }
      return Response.failure(res, { message: 'old password is not correct' }, httpCode.BAD_REQUEST);
    } catch (error) {
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async forgotPassword(req, res) {
    const email = req.body.email.toLowerCase();

    if (!email) {
      Response.failure(res, { message: 'email is required' }, httpCode.BAD_REQUEST);
      return;
    }
    try {
      const record = await this.getCustomerIndChild({ email });
      if (!record) {
        Response.failure(res, { message: 'email is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const forgotPasswordToken = crypto.randomBytes(20).toString('hex');
      const updatedRecord = await this.updateCustomerIndChild({ _id: record._id }, {
        resetPasswordToken: forgotPasswordToken,
        resetPasswordExpires: Date.now() + 86400000,
      });
      if (updatedRecord) {
        const content = {};
        content.body = `Hello ${updatedRecord.firstname},<br />
        A password reset was initiated on TheNewsPaperstand.<br />
        Click the link below to reset your password.
        <br /><br />
        ${process.env.FORGOT_PASSWORD_CLIENT_PAGESUITE}/${Constant.CUSTOMER_IND_CHILD}/${forgotPasswordToken}
        <br /><br />
        If you didn't request this, please ignore this email.<br />
        Your password won't change until you access the link above and create a new one.
        <br /><br />
        TheNewspaperStand Team`;
        content.subject = 'Forgot password';
        const mailPayload = {
          email,
          subject: content.subject,
          title: 'Password Reset on TheNewspaperStand',
          html: emailTemp(content),
        };
        await Util.sendMailNotification(mailPayload);
        Response.success(res, { message: 'Email to request password change successfully sent' }, httpCode.OK);
        return;
      }
    } catch (error) {
      logger.info(error);
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async resetPassword(req, res) {
    const { password, confirmPassword, resetPasswordToken } = req.body;

    const missedFiles = await Util.authenticateParams(req.body, ['password', 'confirmPassword', 'resetPasswordToken']);
    if (missedFiles.length > 0) {
      return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
    }
    if (password !== confirmPassword) {
      Response.failure(res, { message: 'Password does not match' }, httpCode.BAD_REQUEST);
      return;
    }
    try {
      const record = await this.getCustomerIndChild({
        resetPasswordToken,
        resetPasswordExpires: {
          $gt: Date.now(),
        },
      });
      if (!record) {
        Response.failure(res, { message: 'Password reset token is invalid or has expired.' }, httpCode.BAD_REQUEST);
        return;
      }
      const bodyToUpdate = {
        password: await Util.hashPassword(req.body.password),
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      };
      const updatedRecord = await this.updateCustomerIndChild({ _id: record.id }, bodyToUpdate);
      if (updatedRecord) {
        const mailPayload = {
          email: record.email,
          subject: 'Your password Reset',
          title: 'Newspaper Stands',
          body: `
          Hello ${updatedRecord.email}!
          You have successfully changed your password. You can now login with the new password
          `,
        };
        await Util.sendMailNotification(mailPayload);
        Response.success(res, { message: 'You have successfully changed your password' }, httpCode.OK);
        return;
      }
    } catch (error) {
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async changeProfilePicture(req, res) {
    upload(req, res, async (e) => {
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

      logger.info('path', req.file);
      fs.readFile(path.toString(), async (err, data) => {
        if (err) {
          return Response.failure(res, { message: 'file not found! unable to read file', response: err }, httpCode.NOT_FOUND);
        }
        try {
          const imageUrl = await Util.uploadToS3(data, Constant.BUCKET_NAME, req.file.filename);
          logger.info('image url from AWS', imageUrl);
          req.body.profilePic = imageUrl.Location;
          const user = await this.updateCustomerIndChild({ _id: req.id }, req.body);
          if (user) {
            if (req.file) {
              fs.unlinkSync(path);
            }
            return Response.success(res, { message: 'successfully changed profile picture', response: user.profilePic }, httpCode.OK);
          }
        } catch (s3Error) {
          if (path) {
            if (req.file) {
              fs.unlinkSync(path);
            }
          }
          if (s3Error.originalError.code === 'NetworkingError') {
            return Response.failure(res, { message: 'network error! check your connection and retry', response: s3Error.message }, httpCode.INTERNAL_SERVER_ERROR);
          }
          return Response.failure(res, { message: 'error while uploading to s3', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
        }
      });
    });
  }
}

module.exports = new Customer();
