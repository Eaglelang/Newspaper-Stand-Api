/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const validator = require('validator');
const Util = require('../../lib/utils');
const audit = require('../../audits/auditHelper');
const Response = require('../../commons/response');
const httpCode = require('../../commons/httpCode');
const AdminSchema = require('../../schema/users/user');
const emailTemp = require('../../commons/email');
const WalletService = require('../../services/users/wallet');
const UserService = require('../../services/users/user');
const Settings = require('../../services/settings');
const SubscriptionService = require('../../services/subscription');
const logger = require('../../lib/logger');
const Constant = require('../../commons/constants');
const { upload, userfields } = require('../helper');
const config = require('../../lib/config');

class User extends UserService {
  async createAdmin(req, res) {
    upload(req, res, async (e) => {
      const neededFields = userfields;
      let isFile = false;

      if (req.fileValidationError) {
        return Response.failure(res, { message: 'incorrect file type', response: req.fileValidationError }, httpCode.BAD_REQUEST);
      }

      if (req.file) {
        isFile = true;
      }


      if (e) {
        return Response.failure(res, { message: 'error uploading image', response: e }, httpCode.BAD_REQUEST);
      }

      const path = req.file !== undefined ? req.file.path : '';

      const email = req.body.email.toLowerCase();

      if (!validator.isEmail(email)) {
        return Response.failure(res, { message: 'email format incorrect' }, httpCode.UNPROCESSED_ENTITY);
      }
      try {
        const isSuperAdminExists = await this.checkSuperAdmin({ role: Constant.SUPER_ADMIN });
        if (!isSuperAdminExists) {
          req.body.role = Constant.SUPER_ADMIN;
          if (!req.body.dob) {
            if (req.file) {
              fs.unlinkSync(path);
            }
            return Response.failure(res, { message: 'bad request! admin must pass dob' }, httpCode.UNPROCESSED_ENTITY);
          }
        }

        const missedFiles = await Util.authenticateParams(req.body, neededFields);
        if (missedFiles.length > 0) {
        // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
        }


        const userRoles = [Constant.SUPER_ADMIN, Constant.ADMIN, Constant.USER_ADMIN];
        if (userRoles.indexOf(req.body.role) === -1) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'role not exists' }, httpCode.UNPROCESSED_ENTITY);
        }

        if (isSuperAdminExists && req.body.role === Constant.SUPER_ADMIN) {
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'forbidden! you cant create super-admin' }, httpCode.UNPROCESSED_ENTITY);
        }

        const record = await this.checkUser({ email });
        if (record) {
          // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'email already exists' }, httpCode.BAD_REQUEST);
        }

        const isPhoneNumber = await this.checkUser({ phoneNumber: req.body.phoneNumber });
        if (isPhoneNumber) {
          // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'user already exists with the phoneNumber' }, httpCode.BAD_REQUEST);
        }
        try {
          const rawPassword = req.body.password;
          const hashedPassword = await Util.hashPassword(req.body.password);
          req.body.password = hashedPassword;
          try {
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
                const admin = await this.addUser(req.body);
                if (admin && req.body.role === Constant.SUPER_ADMIN) {
                  // save the seed data for system functionality
                  const tnsWallet = {
                    userId: Constant.TNS_WALLET_ID,
                  };
                  const blusaltWallet = {
                    userId: Constant.BLUSALT_WALLET_ID,
                  };

                  const minWalletAmount = {
                    settingId: Constant.SETTING_ID,
                  };

                  const initDiscountData = {
                    durationId: config.currentDurationId,
                    daily: 0,
                    weekly: 0.124,
                    monthly: 0.34,
                    quarterly: 0.36,
                  };
                  const createdWallet = await new WalletService().addTNSWallet(tnsWallet);
                  const createdBlu = await new WalletService().addCustomerWallet(blusaltWallet);
                  const duration = await new SubscriptionService().addDuration(initDiscountData);
                  const minimumAmount = await new Settings().findOrCreateSetting(minWalletAmount);
                  logger.info(createdWallet, createdBlu, duration, minimumAmount);
                }
                if (admin) {
                  if (req.file) {
                    fs.unlinkSync(path);
                  }
                  logger.info(`successfully created a new record${admin.role}`);
                  const content = {};
                  content.body = `Hello ${admin.firstname},<br />
                  You have been added as an admin on TheNewspaperStand with the role: ${admin.role},<br /><br />
                  Find below your login details; here you will be able to login, monitor, and manage the portal.
                  <br /><br />
                  URL: ${process.env.CLIENT_ADMIN_PORTAL}<br />
                  Email: ${admin.email}<br />
                  Password: ${rawPassword}
                  <br /><br />
                  Click ${process.env.CLIENT_ADMIN_PORTAL} to login and reset your password.
                  <br /><br />
                  Thank you<br />
                  TheNewspaperStand Team`;
                  content.subject = 'Admin account creation';
                  const mailPayload = {
                    email,
                    subject: content.subject,
                    title: 'Welcome to TheNewsPaperStand',
                    html: emailTemp(content),
                  };
                  Util.sendMailNotification(mailPayload)
                    .then((resp) => {
                      logger.info('successfully sent mail', resp);
                      audit.trail('You have successfully become a part of TNS', 'account registration', admin._id);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: admin.email, role: admin.role, id: admin._id },
                      }, httpCode.CREATED);
                    }).catch((mailError) => {
                      logger.info(mailError);
                      return Response.success(res, {
                        message: 'successfully created a new record',
                        response: { email: admin.email, role: admin.role, id: admin._id },
                      }, httpCode.CREATED);
                    });
                }
              } catch (s3Error) {
                // delete the file...
                if (req.file) {
                  fs.unlinkSync(path);
                }
                return Response.failure(res, { message: 'error while uploading to s3', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
              }
            });
          } catch (err) {
            // delete the file...
            if (req.file) {
              fs.unlinkSync(path);
            }
            logger.info('cant create admin', err);
            return Response.failure(res, { message: 'unable to create a new admin', response: err }, httpCode.INTERNAL_SERVER_ERROR);
          }
        } catch (error) {
          // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          logger.info(error);
          return Response.failure(res, { message: 'unable to hash password', data: error }, httpCode.INTERNAL_SERVER_ERROR);
        }
      } catch (error) {
        // delete the file...
        if (req.file) {
          fs.unlinkSync(path);
        }
        return Response.failure(res, { message: 'unable to check db by email', response: error }, httpCode.INTERNAL_SERVER_ERROR);
      }
    });
  }

  async adminSignIn(req, res) {
    const data = req.body;
    const { password } = data;
    const email = req.body.email.toLowerCase();
    // validate schema
    await AdminSchema.signInAdmin.validateAsync(data);

    try {
      const record = await this.getUser({ email });
      if (!record) {
        return Response.failure(res, { message: 'email entered not exists' }, httpCode.UNAUTHORIZED);
      }

      if (record && record.status !== 'active') {
        return Response.failure(res, { message: 'your account is not active' }, httpCode.UNAUTHORIZED);
      }
      bcrypt.compare(password, record.password, (err, result) => {
        if (err) {
          logger.info(err);
          return Response.failure(res, { message: 'unable to campare password', response: err }, httpCode.UNAUTHORIZED);
        }
        if (result) {
          const { _id } = record;
          const token = jwt.sign({ email: record.email, id: record._id, role: record.role },
            process.env.JWT_SECRET, { expiresIn: '6h' });
          audit.trail('You have successfully logged in', 'TNS member logged in', _id);
          return Response.success(res, { message: 'admin successfully logged in', response: { token, userId: _id } }, httpCode.OK);
        }
        return Response.failure(res, { message: 'incorrect password' }, httpCode.UNAUTHORIZED);
      });
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to check admin by email from db', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getUsers(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    const {
      page, sort, limit, role, status,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.query = {};
      params.select = '';

      if (role) {
        params.query.role = role;
      }
      if (status) {
        params.query.status = status;
      }
      if (req.role === Constant.ADMIN && role && role !== Constant.USER_ADMIN) {
        return Response.failure(res, { message: 'forbidden! you cant access up your level' }, httpCode.FORBIDDEN);
      }
      const result = await this.getAllPaginatedUsers(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'users fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no users record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query users collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserById(req, res) {
    const { userId } = req.params;

    if (userId === undefined) {
      return Response.failure(res, { message: 'userId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: userId };
      param.fields = { password: 0, cPassword: 0 };
      const user = await this.getUser(param);
      logger.info(user);
      if (user) {
        return Response.success(res, {
          message: 'user record successully fetched',
          response: user,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'user not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query user collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateUserById(req, res) {
    const { userId } = req.params;
    try {
      if (!userId) {
        Response.failure(res, { message: 'userId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const user = await this.updateUser({ _id: userId }, req.body);
      if (user) {
        Response.success(res, { message: 'user updated well!!', response: user }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'userId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async setAdminAccountStatus(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you don\'t have access this resource' }, httpCode.FORBIDDEN);
    }
    const { userId, status } = req.query;

    try {
      if (!userId) {
        Response.failure(res, { message: 'userId is required' }, httpCode.BAD_REQUEST);
        return;
      }

      if (status !== 'active' && status !== 'inactive') {
        Response.failure(res, { message: 'status is required and takes either active or inactive' }, httpCode.BAD_REQUEST);
        return;
      }
      const message = status === 'active' ? 'active' : 'not active';
      const record = await this.getUser({ _id: userId });

      if (!record) {
        Response.failure(res, { message: 'user not found' }, httpCode.NOT_FOUND);
        return;
      }
      if (record && record.status === status) {
        Response.failure(res, { message: `user is already ${message}` }, httpCode.BAD_REQUEST);
        return;
      }
      if (req.role === Constant.ADMIN) {
        if (record && record.role !== 'user') {
          Response.failure(res, { message: 'forbidden! you can only set a user account' }, httpCode.FORBIDDEN);
          return;
        }
      }
      const action = status === 'active' ? 'activate' : 'deactivate';
      const user = await this.updateUser({ _id: userId }, { status });
      if (user) {
        audit.trail(`You have successfully ${action}d an admin account`, 'account setting', req.id);
        Response.success(res, { message: `you have successfully ${action} the user`, response: user.email }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        Response.failure(res, { message: 'userId passed does not exists' }, httpCode.NOT_FOUND);
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

    if (newPassword !== confirmPassword) {
      Response.failure(res, { message: 'Password does not match' }, httpCode.BAD_REQUEST);
      return;
    }
    try {
      const record = await this.getUser({ _id: req.id });
      logger.info(record);
      if (!record) {
        Response.failure(res, { message: 'record is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const bodyToUpdate = {
        password: await Util.hashPassword(req.body.newPassword),
      };
      const isPassordCorrect = await bcrypt.compareSync(oldPassword, record.password);
      if (isPassordCorrect) {
        const updatedRecord = await this.updateUser({ _id: req.id }, bodyToUpdate);
        if (updatedRecord) {
          audit.trail('you have successfully changed password', 'password change', req.id);
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
      const record = await this.getUser({ email });
      if (!record) {
        Response.failure(res, { message: 'email is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const forgotPasswordToken = crypto.randomBytes(20).toString('hex');
      const updatedRecord = await this.updateUser({ _id: record._id }, {
        resetPasswordToken: forgotPasswordToken,
        resetPasswordExpires: Date.now() + 86400000,
      });
      if (updatedRecord) {
        logger.info(updatedRecord);
        const content = {};
        content.body = `Hello ${updatedRecord.firstname},<br />
        A password reset was initiated on TheNewsPaperstand.<br />
        Click the link below to reset your password.
        <br /><br />
        ${process.env.FORGOT_PASSWORD_CLIENT}/${record.role}/${forgotPasswordToken}
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
        Util.sendMailNotification(mailPayload)
          .then((resp) => {
            logger.info(resp);
            Response.success(res, { message: 'email to request password change successfully sent' }, httpCode.OK);
          }).catch((mailError) => {
            logger.info(mailError);
            Response.failure(res, { message: 'email not sent, try again later' }, httpCode.INTERNAL_SERVER_ERROR);
          });
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
      const record = await this.getUser({
        resetPasswordToken,
        resetPasswordExpires: {
          $gt: Date.now(),
        },
      });
      if (!record) {
        Response.failure(res, { message: 'Password reset token is invalid or has expired.' }, httpCode.BAD_REQUEST);
        return;
      }
      logger.info(record);
      const bodyToUpdate = {
        password: await Util.hashPassword(req.body.password),
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      };
      const updatedRecord = await this.updateUser({ _id: record.id }, bodyToUpdate);
      if (updatedRecord) {
        logger.info('updated password in db!!!!!!');
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
        audit.trail('you have successfully reset your password', 'password reset', record._id);
        Response.success(res, { message: 'You have successfully changed your password' }, httpCode.OK);
        return;
      }
    } catch (error) {
      console.log(error);
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
          const user = await this.updateUser({ _id: req.id }, req.body);
          if (user) {
            if (req.file) {
              fs.unlinkSync(path);
            }
            audit.trail('you have successfully changed your profile pic.', 'profile picture changed', req.id);
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

module.exports = new User();
