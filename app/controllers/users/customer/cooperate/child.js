/* eslint-disable no-plusplus */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-undef */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');
const shortid = require('shortid');
const audit = require('../../../../audits/auditHelper');
const Util = require('../../../../lib/utils');
const emailTemp = require('../../../../commons/email');
const Response = require('../../../../commons/response');
const httpCode = require('../../../../commons/httpCode');
const CustomerService = require('../../../../services/users/customer');
const logger = require('../../../../lib/logger');
const Constant = require('../../../../commons/constants');
const { upload, uploadChildren, coopChildfields } = require('../../../helper');


class Customer extends CustomerService {
  // !!!!!! customer signs up !!!!!!!
  async createCooperateChild(req, res) {
    let isFile = false;
    upload(req, res, async (e) => {
      if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
        && req.role !== Constant.USER_ADMIN && req.role !== Constant.CUSTOMER_COOP_PARENT) {
        logger.info('error! you don\'t have access to this resource');
        return Response.failure(res, { message: 'error! you don\'t have access to this resource' }, httpCode.FORBIDDEN);
      }
      let parentObject = await this.getCustomerCoopParent({ _id: req.id });
      if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN && req.role !== Constant.USER) {
        if (!parentObject) {
          logger.info('error! you don\'t have a parent account');
          return Response.failure(res, { message: 'error! you don\'t have a parent account' }, httpCode.FORBIDDEN);
        }
      }
      const neededFields = coopChildfields;

      const missedFiles = await Util.authenticateParams(req.body, neededFields);
      if (missedFiles.length > 0) {
        // delete the file...
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
      }
      if (req.fileValidationError) {
        return Response.failure(res, { message: 'incorrect file type', response: req.fileValidationError }, httpCode.BAD_REQUEST);
      }

      if (req.file) {
        isFile = true;
      }


      if (e) {
        return Response.failure(res, { message: 'error uploading image', response: e }, httpCode.BAD_REQUEST);
      }
      if (req.role !== Constant.CUSTOMER_COOP_PARENT) {
        if (!req.body.businessId) {
          return Response.failure(res, { message: 'businessId is required' }, httpCode.BAD_REQUEST);
        }
        parentObject = await this.getCustomerCoopParent({ _id: req.body.businessId });
        if (!parentObject) {
          return Response.failure(res, { message: 'businessId not exists' }, httpCode.BAD_REQUEST);
        }
      } else { req.body.businessId = req.id; }

      const path = req.file !== undefined ? req.file.path : '';

      const email = req.body.email.toLowerCase();
      try {
        const record = await this.checkCustomerCoopChild({ $or: [{ email }, { phoneNumber: req.body.phoneNumber }] });
        logger.info(record);
        if (record) {
          if (req.file) {
            // delete the file...
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'user already exists' }, httpCode.BAD_REQUEST);
        }
        try {
          if (!req.body.password) req.body.password = shortid.generate();
          const rawPassword = req.body.password;
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
                const imageUrl = isFile === true ? await Util.uploadToS3(data, Constant.BUCKET_NAME, req.file.filename) : '';
                logger.info('image url from AWS', imageUrl);
                if (imageUrl !== '') {
                  req.body.profilePic = imageUrl.Location;
                }
                req.body.email = req.body.email.toLowerCase();
                const user = await this.addCustomerCoopChild(req.body);
                if (user) {
                  if (req.file) {
                    // delete the file...
                    fs.unlinkSync(path);
                  }
                  const content = {};
                  content.body = `Hello ${user.firstname},<br />
                  ${parentObject.companyName} just created an account for you on TheNewspaperStand App as a sub account, your crendentials are as follow.
                  <br /><br />
                  email: ${user.email}<br />
                  password: ${rawPassword}
                  <br /><br />
                  Explore, Subscribe, Enjoy and Get digital replicas of your favourite Newspapers and Magazines delivered to you on your web and mobile devices from Nigeria's leading newspaper and magazine titles.
                  <br /><br />
                  Happy Reading,<br />
                  TheNewspaperStand Team`;
                  content.subject = 'Customer sub-account creation';
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
                      audit.trail('Main account added a member',
                        'Sub-account created', req.id,
                        user);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: user.email, id: user._id },
                      }, httpCode.CREATED);
                    }).catch((mailError) => {
                      logger.info(mailError);
                      logger.info('successfully created a new record', user);
                      return Response.success(res, {
                        message: 'successfully created a new record! but email not sent',
                        response: { email: user.email, id: user._id },
                      }, httpCode.CREATED);
                    });
                }
              } catch (s3Error) {
                console.log(s3Error);
                if (path) {
                  // delete the file...
                  fs.unlinkSync(path);
                }
                return Response.failure(res, { message: 'error while uploading to s3', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
              }
            });
          } catch (err) {
            if (path) {
              // delete the file...
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
        if (path) {
          // delete the file...
          fs.unlinkSync(path);
        }
        logger.info(error);
        return Response.failure(res, { message: 'unable to check db by email', response: error }, httpCode.INTERNAL_SERVER_ERROR);
      }
    });
  }

  async createCooperateChildInBulk(req, res) {
    uploadChildren(req, res, async (e) => {
      try {
        if (req.fileValidationError) {
          return Response.failure(res, { message: 'incorrect file type', response: req.fileValidationError }, httpCode.BAD_REQUEST);
        }
        if (e) {
          return Response.failure(res, { message: 'error uploading children CSV file', response: e }, httpCode.BAD_REQUEST);
        }
        if (!req.file) {
          return Response.failure(res, { message: 'children csv file required' }, httpCode.BAD_REQUEST);
        }
        if (!req.body.businessId) req.body.businessId = req.id;
        const isParent = await this.checkCustomerCoopParent({ _id: req.body.businessId });
        if (!isParent) return Response.failure(res, { message: 'businessId not exists' }, httpCode.NOT_FOUND);

        await this.processBulkData(req.file.path.toString(), req).then(async (data) => {
          if (data.bulkData.length <= 0) {
            fs.unlinkSync(req.file.path);
            logger.info('users exists ensure data uploaded is/are correct');
            return Response.failure(res, { message: 'data not processed users exists' }, httpCode.BAD_REQUEST);
          }
          logger.info('****** data to save *******');
          logger.info(data.bulkData);
          const savedData = await this.addBulkCustomerCoopChild(data.bulkData);
          logger.info(`successfully created ${savedData.length} of ${data.count - 1} records`);
          logger.info(savedData);
          if (savedData) {
            fs.unlinkSync(req.file.path);
            return Response.success(res, {
              message: `successfully created ${savedData.length} of ${data.count - 1} records`,
              response: savedData,
            }, httpCode.CREATED);
          }
        }).catch((err) => {
          logger.info(err);
          if (err === 'empty data was found in the data') {
            return Response.failure(res, { message: 'empty file was uploaded' }, httpCode.BAD_REQUEST);
          }
          return Response.failure(res, { message: 'an error occoured', err }, httpCode.BAD_REQUEST);
        });
      } catch (error) {
        logger.info(error);
        fs.unlinkSync(req.file.path);
        if (error.msg && error.msg.name === 'CastError') {
          return Response.failure(res, { message: 'bussinessId not found', response: error.msg.name }, httpCode.BAD_REQUEST);
        }
        return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
      }
    });
  }

  // !!!! get customer by id !!!!!!
  async getCustomerCoopChildById(req, res) {
    const { id } = req.params;

    if (id === undefined) {
      return Response.failure(res, { message: 'id required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: id };
      param.fields = {
        businessId: 0, status: 0, isTrial: 0, verified: 0, password: 0,
      };
      const customer = await this.getCustomerCoopChild(param);
      if (customer) {
        audit.trail('viewed profile detail', 'account profile checked', req.id, { customer });
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

  async getCooperateChildrenCustomer(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.CUSTOMER_COOP_PARENT
      && req.role !== Constant.ADMIN) {
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
      const result = await this.getAllPaginatedCustomerCoopChildren(params);
      audit.trail('viewed profile detail', 'viewed all members profile', req.id);
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

  async setChildAccountStatus(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.CUSTOMER_COOP_PARENT && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you don\'t have access this resource' }, httpCode.FORBIDDEN);
    }
    const { childId, status } = req.query;
    const statuses = ['active', 'inactive'];

    try {
      if (!childId) {
        Response.failure(res, { message: 'childId is required' }, httpCode.BAD_REQUEST);
        return;
      }

      if (!status || statuses.indexOf(status) === -1) {
        Response.failure(res, { message: 'status is required and takes either active or inactive' }, httpCode.BAD_REQUEST);
        return;
      }
      const message = status === 'active' ? 'active' : 'not active';
      const record = await this.getCustomerCoopChild({ _id: childId });
      if (!record) {
        Response.failure(res, { message: 'child account not found' }, httpCode.OK);
        return;
      }
      if (record.status === status) {
        Response.failure(res, { message: `child account is already ${message}` }, httpCode.BAD_REQUEST);
        return;
      }
      if (record.businessId !== req.id) {
        Response.failure(res, { message: 'forbidden! you cannot set child not belong to you' }, httpCode.FORBIDDEN);
        return;
      }
      const action = status === 'active' ? 'activate' : 'deactivate';
      const child = await this.updateCustomerCoopChild({ _id: childId }, { status });
      if (child) {
        const content = {};
        if (status === 'active') {
          content.body = `<strong>Hello ${child.firstname}<strong/>,<br />
          Your account has been ${action}d. You can now login into your account.
          <br /><br />
          Email: ${child.email}
          <br /><br />
          Thank you,<br />
          TheNewspaperStand Team`;
        } else {
          content.body = `<strong>Hello ${child.firstname}<strong/>,<br />
          Your account has been deactivated. You won’t be able to login into your account. Contact TheNewspaperStand admin or your key account manager.
          <br /><br />
          Sorry for the inconvenience.
          <br /><br />
          Thank you,<br />
          TheNewspaperStand Team`;
        }
        content.subject = `${action.charAt(0).toUpperCase() + action.slice(1)} sub-account`;
        const mailPayload = {
          email: child.email,
          subject: content.subject,
          title: `Account ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
          html: emailTemp(content),
        };
        Util.sendMailNotification(mailPayload)
          .then(async (resp) => {
            logger.info(resp);
            logger.info(`you have successfully ${action} the child account`);
            await audit.trail(`you have successfully ${action} the child account`, 'set child account status', req.id);
            return Response.success(res, { message: `you have successfully ${action} the child account`, response: child.email }, httpCode.OK);
          }).catch(async (mailError) => {
            logger.info(mailError);
            logger.info(`you have successfully ${action} the user`);
            await audit.trail(`you have successfully ${action} the user`, 'set account status', req.id);
            return Response.success(res, { message: `you have successfully ${action} the child account`, response: child.email }, httpCode.OK);
          });
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'childId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCooperateChildById(req, res) {
    const { id } = req.params;
    try {
      if (!id) {
        Response.failure(res, { message: 'id is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const record = await this.updateCustomerCoopChild({ _id: id }, req.body);
      if (record) {
        delete record.password;
        delete record.status;
        delete record.isTrial;
        delete record.verified;
        audit.trail('profile update', 'updated profile record', req.id);
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
      const record = await this.getCustomerCoopChild({ _id: req.id });
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
        const updatedRecord = await this.updateCustomerCoopChild({ _id: req.id }, bodyToUpdate);
        if (updatedRecord) {
          audit.trail('You changed your old password', 'change of password', req.id);
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
      const record = await this.getCustomerCoopChild({ email });
      if (!record) {
        Response.failure(res, { message: 'email is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const forgotPasswordToken = crypto.randomBytes(20).toString('hex');
      const updatedRecord = await this.updateCustomerCoopChild({ _id: record._id }, {
        resetPasswordToken: forgotPasswordToken,
        resetPasswordExpires: Date.now() + 86400000,
      });
      if (updatedRecord) {
        const content = {};
        content.body = `Hello ${updatedRecord.firstname},<br />
        A password reset was initiated on TheNewsPaperstand.<br />
        Click the link below to reset your password.
        <br /><br />
        ${process.env.FORGOT_PASSWORD_CLIENT_PAGESUITE}/${Constant.CUSTOMER_COOP_CHILD}/${forgotPasswordToken}
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
        audit.trail('You initiated password reset', 'You initiated password reset', req.id);
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
      const record = await this.getCustomerCoopChild({
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
      const updatedRecord = await this.updateCustomerCoopChild({ _id: record.id }, bodyToUpdate);
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
        audit.trail('Forogot password', 'You successfully changed reset password with forgot password', req.id);
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
          const user = await this.updateCustomerCoopChild({ _id: req.id }, req.body);
          if (user) {
            fs.unlinkSync(path);
            audit.trail('Profile picture change', 'You changed your profile picture', req.id);
            return Response.success(res, { message: 'successfully changed profile picture', response: user.profilePic }, httpCode.OK);
          }
        } catch (s3Error) {
          if (path) {
            fs.unlinkSync(path);
          }
          if (s3Error.originalError.code === 'NetworkingError') {
            return Response.failure(res, { message: 'network error! check your connection and retry', response: s3Error.message }, httpCode.INTERNAL_SERVER_ERROR);
          }
          return Response.failure(res, { message: 'error while uploading to s3', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
        }
      });
    });
  }

  async processBulkData(filepath, req) {
    return new Promise((resolve, reject) => {
      const file = fs.readFileSync(filepath, 'utf8');
      let listOfemployees = file.split('\n');
      listOfemployees = listOfemployees.filter((el) => el.trim() !== '');
      if (listOfemployees.length <= 1) return reject(new Error('empty data was found in the data'));

      const bulkData = [];
      let count = 0;
      // eslint-disable-next-line array-callback-return
      listOfemployees.forEach(async (employee, index, arr) => {
        // eslint-disable-next-line no-param-reassign
        employee = employee.replace(/\r?\n|\r/g, '');

        if (employee.trim() !== '' && count !== 0) {
          const eachDataArray = employee.split(',');
          const email = eachDataArray[0];
          const phoneNumber = eachDataArray[1];
          const password = shortid.generate();
          const firstname = eachDataArray[2];
          const lastname = eachDataArray[3];
          const country = eachDataArray[4];

          const isExists = await this.checkCustomerCoopChild({ $or: [{ email }, { phoneNumber }] });
          if (validator.isEmail(email)) {
            if (!isExists) {
              bulkData.push({
                phoneNumber,
                email,
                password,
                businessId: req.body.businessId,
                firstname,
                lastname,
                country,
              });
            }
          }
          if (index === arr.length - 1) return resolve({ count: arr.length, bulkData });
        }
        count++;
      });
    });
  }
}

module.exports = new Customer();
