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
const emailTemp = require('../../../../commons/email');
const Util = require('../../../../lib/utils');
const Response = require('../../../../commons/response');
const httpCode = require('../../../../commons/httpCode');
const CustomerSchema = require('../../../../schema/users/customer');
const WalletService = require('../../../../services/users/wallet');
const CustomerService = require('../../../../services/users/customer');
const logger = require('../../../../lib/logger');
const Constant = require('../../../../commons/constants');
const { upload, indParentfields } = require('../../../helper');

class Customer extends CustomerService {
  // !!!!!! customer signs up !!!!!!!
  async createIndividualParent(req, res) {
    let isFile = false;
    upload(req, res, async (e) => {
      logger.info(req.body);
      const neededFields = indParentfields;

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
        if (!validator.isEmail(email)) {
          return Response.failure(res, { message: 'email format incorrect' }, httpCode.UNPROCESSED_ENTITY);
        }
        const record = await this.checkCustomerIndParent({ email });
        const corporate = await this.checkCustomerCoopParent({ email });
        logger.info(record);
        if (record || corporate) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'email already exists' }, httpCode.BAD_REQUEST);
        }

        const isPhoneNumber = await this.checkCustomerIndParent({ phoneNumber: req.body.phoneNumber });
        const isPhoneNumberCorp = await this.checkCustomerCoopParent({ phoneNumber: req.body.phoneNumber });

        if (isPhoneNumber || isPhoneNumberCorp) {
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
                const user = await this.addCustomerIndParent(req.body);
                if (user) {
                  if (req.file) {
                    fs.unlinkSync(path);
                  }
                  // the front end should ensure validity of countries
                  if (user.country.toString().toLowerCase() === Constant.LOCAL) {
                    const wallet = {
                      userId: user._id,
                    };
                    const customerWallet = await new WalletService().addCustomerWallet(wallet);
                    logger.info(customerWallet);
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
                      logger.info('successfully created a new record', user);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user._id },
                      }, httpCode.CREATED);
                      // notify the record via mail and to change his password
                    }).catch((mailError) => {
                      logger.info(mailError);
                      logger.info('successfully created a new record', user);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user._id },
                      }, httpCode.CREATED);
                      // notify the record via mail and to change his password
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


  // !!!! sign in customer !!!!!!
  async signinCustomerIndParent(req, res) {
    const data = req.body;
    const { password } = data;
    const email = req.body.email.toLowerCase();

    CustomerSchema.signInCustomer.validateAsync(req.body);

    try {
      const record = await this.getCustomerIndParent({ email });
      if (!record) {
        return Response.failure(res, { message: 'email entered not exists' }, httpCode.NOT_FOUND);
      }

      if (record && record.verified === false) {
        return Response.failure(res, { message: 'user not verified with otp yet' }, httpCode.UNAUTHORIZED);
      }
      bcrypt.compare(password, record.password, (err, result) => {
        if (err) {
          logger.info(err);
          return Response.failure(res, { message: 'unable to campare password', response: err }, httpCode.UNAUTHORIZED);
        }
        if (result) {
          const { _id } = record;
          const token = jwt.sign({ email: record.email, id: record._id, role: Constant.CUSTOMER_COOP_PARENT },
            process.env.JWT_SECRET, { expiresIn: '6h' });
          return Response.success(res, { message: 'customer successfully logged in', response: { token, customerId: _id } }, httpCode.OK);
        }
        return Response.failure(res, { message: 'incorrect password' }, httpCode.UNAUTHORIZED);
      });
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to check customer record by email from db', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  // !!!! get customer by id !!!!!!
  async getCustomerIndParentById(req, res) {
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
      const customer = await this.getCustomerIndParent(param);
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

  async getIndividualParentCustomer(req, res) {
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
      const result = await this.getAllPaginatedCustomerIndParent(params);
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

  async updateIndividualParentById(req, res) {
    const { id } = req.params;
    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.updateCustomerIndParent({ _id: id }, req.body);
      if (record) {
        delete record.password;
        delete record.status;
        delete record.isTrial;
        delete record.verified;
        Response.success(res, { message: 'record updated successfully!!', response: req.body }, httpCode.OK);
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
        const verifiedUser = await this.updateCustomerIndParent({ phoneNumber }, { verified: true });
        logger.info(verifiedUser);
        Response.success(res, { message: 'otp code verified successfully', response: isValid }, httpCode.OK);
        return;
      }
      Response.failure(res, { message: 'otp code not verified', response: 'code seems expired or not correct' }, httpCode.NOT_ACCEPTABLE);
      return;
    } catch (error) {
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
      const record = await this.getCustomerIndParent({ _id: req.id });
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
        const updatedRecord = await this.updateCustomerIndParent({ _id: req.id }, bodyToUpdate);
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
      const record = await this.getCustomerIndParent({ email });
      if (!record) {
        Response.failure(res, { message: 'email is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const forgotPasswordToken = crypto.randomBytes(20).toString('hex');
      const updatedRecord = await this.updateCustomerIndParent({ _id: record._id }, {
        resetPasswordToken: forgotPasswordToken,
        resetPasswordExpires: Date.now() + 86400000,
      });
      if (updatedRecord) {
        const content = {};
        content.body = `Hello ${updatedRecord.firstname},<br />
        A password reset was initiated on TheNewsPaperstand.<br />
        Click the link below to reset your password.
        <br /><br />
        ${process.env.FORGOT_PASSWORD_CLIENT_PAGESUITE}/${Constant.CUSTOMER_IND_PARENT}/${forgotPasswordToken}
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
        Response.success(res, { message: 'email to request password change successfully sent' }, httpCode.OK);
        return;
      }
    } catch (error) {
      console.log(error);
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
      const record = await this.getCustomerIndParent({
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
      const updatedRecord = await this.updateCustomerIndParent({ _id: record.id }, bodyToUpdate);
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
          const user = await this.updateCustomerIndParent({ _id: req.id }, req.body);
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

  async searchIndividualParent(req, res) {
    const { keyword } = req.query;
    try {
      if (!keyword) {
        return Response.failure(res, { message: 'keyword required as query param' }, httpCode.BAD_REQUEST);
      }
      const param = {
        q: { $text: { $search: keyword } },
        fields: { password: 0 },
      };

      const result = await this.searchCustomerIndParent(param);
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
}

module.exports = new Customer();
