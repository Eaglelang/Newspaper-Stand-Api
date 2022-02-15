/* eslint-disable class-methods-use-this */
/* eslint-disable no-undef */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const otplib = require('otplib');
const validator = require('validator');
const Job = require('../../../jobs/agender');
const audit = require('../../../../audits/auditHelper');
const config = require('../../../../lib/config');
const Util = require('../../../../lib/utils');
const Response = require('../../../../commons/response');
const httpCode = require('../../../../commons/httpCode');
const emailTemp = require('../../../../commons/email');
const CustomerSchema = require('../../../../schema/users/customer');
const CustomerService = require('../../../../services/users/customer');
const WalletService = require('../../../../services/users/wallet');
const logger = require('../../../../lib/logger');
const Constant = require('../../../../commons/constants');
const { upload, coopParentfields, verifyRefreshToken } = require('../../../helper');

class Customer extends CustomerService {
  // !!!!!! customer signs up !!!!!!!
  async createCooperateParent(req, res) {
    let isFile = false;
    upload(req, res, async (e) => {
      const neededFields = coopParentfields;

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
        fs.unlinkSync(req.file.path);
        return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
      }

      const path = req.file !== undefined ? req.file.path : '';
      const email = req.body.email.toLowerCase();
      try {
        if (!validator.isEmail(email)) {
          return Response.failure(res, { message: 'email format incorrect' }, httpCode.UNPROCESSED_ENTITY);
        }
        const record = await this.checkCustomerCoopParent({ $or: [{ email }, { phoneNumber: req.body.phoneNumber }] });
        const individual = await this.checkCustomerIndParent({ $or: [{ email }, { phoneNumber: req.body.phoneNumber }] });
        logger.info(record);
        if (record || individual) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'user already exists' }, httpCode.UNAUTHORIZED);
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
                req.body.email = req.body.email.toLowerCase();
                const user = await this.addCustomerCoopParent(req.body);
                if (user) {
                  if (req.file) {
                    fs.unlinkSync(path);
                  }
                  if (user.country.toString().toLowerCase() === Constant.LOCAL) {
                    const wallet = {
                      userId: user._id,
                    };
                    const customerWallet = await new WalletService().addCustomerWallet(wallet);
                    logger.info(customerWallet);
                  }
                  const content = {};
                  content.body = `Hello ${user.firstname},<br />
                  We are super excited to have you on board.<br />
                  We are on a mission to make quality information accessible and affordable.
                  <br /><br />
                  Explore, Subscribe, Enjoy and Get digital replicas of your favourite Newspapers and Magazines delivered to you on your web and<br />
                  mobile devices from Nigeria's leading newspaper and magazine titles.
                  <br /><br />
                  Happy Reading,<br />
                  TheNewspaperStand Team`;
                  content.subject = 'Customer account creation';
                  const mailPayload = {
                    email,
                    subject: content.subject,
                    title: 'Get started with TheNewsPaperStand',
                    html: emailTemp(content),
                  };
                  Util.sendMailNotification(mailPayload)
                    .then((resp) => {
                      logger.info('successfully sent mail', resp);
                      logger.info('successfully created a new record', user);
                      audit.trail('You signed up', 'successfully signed up, an email was sent', user._id);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user.id },
                      }, httpCode.CREATED);
                      // notify the partner via mail and to change his password
                    }).catch((mailError) => {
                      logger.info(mailError);
                      audit.trail('You signed up', 'successfully signed up, an email failed to send', user._id);
                      logger.info('successfully created a new record but email not sent', user);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user.id },
                      }, httpCode.CREATED);
                      // notify the partner via mail and to change his password
                    });
                }
              } catch (s3Error) {
                if (req.file) {
                  fs.unlinkSync(path);
                }
                return Response.failure(res, { message: 'an error occured', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
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


  // !!!! sign in for all customers !!!!!!
  async signinCustomerCoopParent(req, res) {
    const data = req.body;
    const { password } = data;

    CustomerSchema.signInCustomer.validateAsync(req.body);
    try {
      let record;
      let role;
      req.body.email = req.body.email.toLowerCase();
      record = await this.getCustomerCoopParent({ email: req.body.email });
      role = Constant.CUSTOMER_COOP_PARENT;
      if (!record) {
        record = await this.getCustomerIndParent({ email: req.body.email });
        role = Constant.CUSTOMER_IND_PARENT;
      }
      if (!record) {
        record = await this.getCustomerCoopChild({ email: req.body.email });
        role = Constant.CUSTOMER_COOP_CHILD;
      }
      if (!record) {
        record = await this.getCustomerIndChild({ email: req.body.email });
        role = Constant.CUSTOMER_IND_CHILD;
      }
      logger.info(role);

      if (!record) {
        logger.info('email entered not exists');
        return Response.failure(res, { message: 'authentication failed, check your credentials' }, httpCode.UNAUTHORIZED);
      }
      if (record.verified === false) {
        return Response.failure(res, { message: 'user not verified with otp yet', response: record.phoneNumber }, httpCode.UNAUTHORIZED);
      }
      bcrypt.compare(password, record.password, (err, result) => {
        if (err) {
          logger.info(err);
          logger.info('unable to campare password');
          return Response.failure(res, { message: 'authentication failed, check your credentials' }, httpCode.UNAUTHORIZED);
        }
        if (result) {
          const { _id } = record;
          const token = jwt.sign({ email: record.email, id: record._id, role },
            process.env.JWT_SECRET, { expiresIn: '10h' });
          const refToken = jwt.sign({ email: record.email, id: record._id, role },
            process.env.JWT_REFRESH_SECRET, { expiresIn: '1y' });
          audit.trail('customer successfully logged in', 'customer logged in', _id);
          return Response.success(res, {
            message: 'customer successfully logged in',
            response: { token, refreshToken: refToken, customerId: _id },
          }, httpCode.OK);
        }
        return Response.failure(res, { message: 'authentication failed, check your credentials' }, httpCode.UNAUTHORIZED);
      });
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to check customer record by email from db', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async refreshAccessToken(req, res) {
    const { refreshToken } = req.body;
    const payload = {};
    if (!refreshToken) return Response.failure(res, { message: 'refreshToken is required' }, httpCode.BAD_REQUEST);
    try {
      const result = await verifyRefreshToken(refreshToken);
      payload.email = result.email;
      payload.id = result.id;
      payload.role = result.payload;
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10h' });
      const refToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '1y' });
      return Response.success(res, {
        message: 'A new set of token successfully generated',
        response: { token, refreshToken: refToken },
      }, httpCode.OK);
    } catch (error) {
      return Response.failure(res, { message: 'Auth failed', data: error }, httpCode.UNAUTHORIZED);
    }
  }

  // !!!! get customer by id !!!!!!
  async getCustomerCoopParentById(req, res) {
    const { id } = req.params;

    if (id === undefined) {
      return Response.failure(res, { message: 'id required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: id };
      param.fields = {
        status: 0, isTrial: 0, verified: 0, password: 0,
      };
      const customer = await this.getCustomerCoopParent(param);
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

  async getCooperateParentCustomer(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const {
      page, sort, limit, status, businessId,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.query = {};
      params.select = '';

      if (businessId) {
        params.query.businessId = businessId;
      }
      if (status) {
        params.query.status = status;
      }
      const result = await this.getAllPaginatedCustomerCoopParent(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'customer fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no customer record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query customer collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCooperateParentById(req, res) {
    const { id } = req.params;
    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.updateCustomerCoopParent({ _id: id }, req.body);
      if (record) {
        delete record.password;
        delete record.status;
        delete record.isTrial;
        delete record.verified;
        Response.success(res, { message: 'record updated successfully!!', response: record }, httpCode.OK);
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

  async sendOtpToCustomer(req, res) {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      Response.failure(res, { message: 'phoneNumber is required' }, httpCode.BAD_REQUEST);
      return;
    }
    const token = otplib.authenticator.generate(config.otpSecret);
    logger.info(token);
    try {
      let response = await Util.sendOTP({ recipient: phoneNumber, token });
      response = JSON.parse(response);
      if (response.code === 'ok') {
        // save phone and token
        const tokenSaved = await this.indexOTP({ phoneNumber, otp: token });
        logger.info('!!!!!saving token in db!!!!!!!');
        logger.info(tokenSaved);
        return Response.success(res, { message: 'otp sent successfully! 300 secs valid' }, httpCode.OK);
      }
      Response.failure(res, { message: 'failure message from sms provider' }, httpCode.BAD_GATEWAY);
    } catch (error) {
      logger.info(error);
      Response.failure(res, { message: 'an internal server error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyOTPCode(req, res) {
    const { phoneNumber, otp } = req.body;
    if (!otp) {
      Response.failure(res, { message: 'otp code is required' }, httpCode.BAD_REQUEST);
      return;
    }

    if (!phoneNumber) {
      Response.failure(res, { message: 'phoneNumber is required' }, httpCode.BAD_REQUEST);
      return;
    }

    if (otp.length !== 6) {
      Response.failure(res, { message: 'otp code is not correct! the legnth must be 6' }, httpCode.BAD_REQUEST);
      return;
    }
    try {
      const query = { phoneNumber, otp };
      const isValid = await this.verifyOtpAuthenticity(query);
      if (isValid) {
        // update record to verified
        const verifiedUser = await this.updateCustomerCoopParent({ phoneNumber }, { verified: true });
        logger.info(verifiedUser);
        Response.success(res, { message: 'otp code verified successfully', response: isValid }, httpCode.OK);
        return;
      }
      Response.failure(res, { message: 'otp code not verified', response: 'code seems expired or not correct' }, httpCode.NOT_ACCEPTABLE);
      return;
    } catch (error) {
      logger.info(error);
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
      const record = await this.getCustomerCoopParent({ _id: req.id });
      if (!record) {
        Response.failure(res, { message: 'record is not found' }, httpCode.NOT_FOUND);
        return;
      }
      logger.info(record);
      if (newPassword !== confirmPassword) {
        Response.failure(res, { message: 'Password does not match' }, httpCode.BAD_REQUEST);
        return;
      }
      const isPassordCorrect = bcrypt.compareSync(oldPassword, record.password);
      if (isPassordCorrect) {
        const bodyToUpdate = {
          password: await Util.hashPassword(req.body.newPassword),
        };
        const updatedRecord = await this.updateCustomerCoopParent({ _id: req.id }, bodyToUpdate);
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
      const record = await this.getCustomerCoopParent({ email });
      if (!record) {
        Response.failure(res, { message: 'email is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const forgotPasswordToken = crypto.randomBytes(20).toString('hex');
      const updatedRecord = await this.updateCustomerCoopParent({ _id: record._id }, {
        resetPasswordToken: forgotPasswordToken,
        resetPasswordExpires: Date.now() + 86400000,
      });
      if (updatedRecord) {
        const content = {};
        content.body = `Hello ${updatedRecord.firstname},<br />
        A password reset was initiated on TheNewsPaperstand.<br />
        Click the link below to reset your password.
        <br /><br />
        ${process.env.FORGOT_PASSWORD_CLIENT_PAGESUITE}/${Constant.CUSTOMER_COOP_PARENT}/${forgotPasswordToken}
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
      const record = await this.getCustomerCoopParent({
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
      const updatedRecord = await this.updateCustomerCoopParent({ _id: record.id }, bodyToUpdate);
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
          const user = await this.updateCustomerCoopParent({ _id: req.id }, req.body);
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

  async searchCooperateParent(req, res) {
    const { keyword } = req.query;
    try {
      if (!keyword) {
        return Response.failure(res, { message: 'keyword required as query param' }, httpCode.BAD_REQUEST);
      }
      const param = {
        q: { $text: { $search: keyword } },
        fields: { password: 0 },
      };

      const result = await this.searchCustomerCoopParent(param);
      if (result.length > 0) {
        return Response.success(res, {
          message: 'searched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no result for the keyword',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to search collection', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  // ***** freemium package handler ******
  async activate7DaysFreemium(req, res) {
    const { accountType } = req.query;
    const email = req.query.email.toLowerCase();
    if (!email || !accountType) {
      return Response.failure(res, { message: 'email and accounType required in the query' }, httpCode.BAD_REQUEST);
    }
    if (accountType !== 'cooperate' && accountType !== 'individual') {
      return Response.failure(res, { message: 'accountType must be either cooperate or individual' }, httpCode.BAD_REQUEST);
    }
    await Job.deactiveIsTrialFeautureAfter7Days(req.id, email, accountType);
    return Response.success(res, { message: 'successfully activated your 7 days freemium package' }, httpCode.OK);
  }
}

module.exports = new Customer();
