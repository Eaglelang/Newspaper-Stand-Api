/* eslint-disable max-len */
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
const WalletService = require('../../services/users/wallet');
const partnerSchema = require('../../schema/users/partner');
const PartnerService = require('../../services/users/partner');
const logger = require('../../lib/logger');
const Constant = require('../../commons/constants');
const emailTemp = require('../../commons/email');
const { upload, partnerfields, neededPartnerUserFields } = require('../helper');

class Partner extends PartnerService {
  async createPartner(req, res) {
    logger.info(req.role);
    let isFile = false;
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.PARTNER_ADMIN
      && req.role !== Constant.ADMIN && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res,
        { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    upload(req, res, async (e) => {
      const neededFields = partnerfields;
      const email = req.body.email.toLowerCase();

      if (!validator.isEmail(email)) {
        return Response.failure(res, { message: 'email format incorrect' }, httpCode.UNPROCESSED_ENTITY);
      }

      const roles = [Constant.PARTNER_ADMIN, Constant.USER];
      logger.info(req.body.role);
      if (roles.indexOf(req.body.role) === -1) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return Response.failure(res, { message: 'role not exists' }, httpCode.UNPROCESSED_ENTITY);
      }

      if (req.role === Constant.PARTNER_ADMIN && req.body.role !== Constant.USER) {
        logger.info('forbidden! you cant access this resource');
        return Response.failure(res, { message: 'forbidden! you only have access to create role (user)' }, httpCode.FORBIDDEN);
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

      const path = req.file !== undefined ? req.file.path : '';
      let message = '';
      req.body.creatorId = req.id;

      if (req.body.role === Constant.USER) {
        message = 'Welcome to Newspaper Stands. you have just been added as a partner user on Newspaper Stand';
        const missedFiles = await Util.authenticateParams(req.body, neededPartnerUserFields);
        if (missedFiles.length > 0) {
        // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: `bad request! pass the missing fields - [${missedFiles.join(',')}]` }, httpCode.UNPROCESSED_ENTITY);
        }

        const excessFeilds = await Util.validateParams(req.body, neededPartnerUserFields);
        if (excessFeilds.length > 0) {
        // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: `bad request! these fields are not required - [${excessFeilds.join(',')}]` }, httpCode.UNPROCESSED_ENTITY);
        }
      } else {
        message = '';
        const missedFiles = await Util.authenticateParams(req.body, neededFields);
        if (missedFiles.length > 0) {
        // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
        }

        const excessFeilds = await Util.validateParams(req.body, neededFields);
        if (excessFeilds.length > 0) {
        // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: `bad request! these fields are not required - [${excessFeilds.join(',')}]` }, httpCode.UNPROCESSED_ENTITY);
        }
      }
      try {
        const record = await this.checkPartner({ email });
        if (record) {
          // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'email already exists' }, httpCode.BAD_REQUEST);
        }

        if (record && record.cacNumber === req.body.cacNumber) {
          // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'company already exists' }, httpCode.BAD_REQUEST);
        }
        const isPhoneNumber = await this.checkPartner({ phoneNumber: req.body.phoneNumber });

        if (isPhoneNumber) {
          // delete the file...
          if (req.file) {
            fs.unlinkSync(path);
          }
          return Response.failure(res, { message: 'record already exists with the phoneNumber' }, httpCode.BAD_REQUEST);
        }
        try {
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
                // eslint-disable-next-line max-len
                const imageUrl = isFile === true ? await Util.uploadToS3(data, Constant.BUCKET_NAME, req.file.filename) : '';
                logger.info('image url from AWS', imageUrl);
                if (imageUrl !== '') {
                  req.body.profilePic = imageUrl.Location;
                }
                req.body.email = req.body.email.toLowerCase();
                const partnerRecord = await this.addPartner(req.body);
                if (partnerRecord && req.body.role === Constant.PARTNER_ADMIN) {
                  const wallet = {
                    userId: partnerRecord._id,
                  };
                  const partnerWallet = await new WalletService().addPartnerWallet(wallet);
                  logger.info(partnerWallet);
                }
                if (partnerRecord) {
                  // delete the file after uploading...
                  if (req.file) {
                    fs.unlinkSync(path);
                  }
                  const { role, _id } = partnerRecord;
                  const content = {};
                  content.body = `Hello <strong>${partnerRecord.firstname}</strong>,<br />
                  We are excited to have you onboard. We are on a mission to make quality information accessible and affordable.
                  Find below your login details; here you will be able to login, view real time sales transactions, the amount accrued to your publication, and basic analytics.
                  <br /><br />
                  Portal link: ${process.env.CLIENT_PARTNER_PORTAL}<br />
                  Email: ${partnerRecord.email}<br />
                  Password: ${rawPassword}
                  <br /><br />
                  Click ${process.env.CLIENT_PARTNER_PORTAL} to login and reset your password.
                  <br /><br />
                  Thank you for joining us.<br />
                  TheNewspaperStand Team`;
                  content.subject = 'Partner account creation';
                  const mailPayload = {
                    email,
                    subject: content.subject,
                    title: `Welcome  ${partnerRecord.companyName ? partnerRecord.companyName : partnerRecord.firstname} to TheNewsPaperStand`,
                    html: message !== '' ? message : emailTemp(content),
                  };
                  Util.sendMailNotification(mailPayload)
                    .then((resp) => {
                      logger.info('successfully sent mail', resp);
                      logger.info('successfully created a new partner', role);
                      return Response.success(res, {
                        message: 'successfully created a new partner',
                        response: { email: partnerRecord.email, role, id: _id },
                      }, httpCode.CREATED);
                      // notify the partner via mail and to change his password
                    }).catch((mailError) => {
                      logger.info(mailError);
                      logger.info('successfully created a new partner', role);
                      return Response.success(res, {
                        message: 'successfully created a new partner',
                        response: { email: partnerRecord.email, role, id: _id },
                      }, httpCode.CREATED);
                      // notify the partner via mail and to change his password
                    });
                }
              } catch (s3Error) {
                // delete the file...
                if (req.file) {
                  fs.unlinkSync(path);
                }
                console.log(s3Error);
                return Response.failure(res, { message: 'error while uploading to s3', response: s3Error }, httpCode.INTERNAL_SERVER_ERROR);
              }
            });
          } catch (err) {
            // delete the file...
            if (req.file) {
              fs.unlinkSync(path);
            }
            logger.info('cant create partnerRecord', err);
            return Response.failure(res, { message: 'unable to create a new partnerRecord', response: err }, httpCode.INTERNAL_SERVER_ERROR);
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

  async partnerSignIn(req, res) {
    const data = req.body;
    const { password } = data;
    const email = req.body.email.toLowerCase();

    // validate schema
    await partnerSchema.signInpartner.validateAsync(data);

    try {
      const record = await this.getPartner({ email });
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
          return Response.success(res, { message: 'partner record successfully logged in', response: { token, partnerId: _id } }, httpCode.OK);
        }
        return Response.failure(res, { message: 'incorrect password' }, httpCode.UNAUTHORIZED);
      });
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to check partner record by email from db', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPartners(req, res) {
    logger.info(req.role);
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
       && req.role !== Constant.USER_ADMIN && req.role !== Constant.PARTNER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const {
      page, sort, limit, role, cacNumber, country, creatorId, status,
    } = req.query;
    if (req.role === Constant.PARTNER_ADMIN && !creatorId) {
      return Response.failure(res, { message: 'forbidden! you can allow view your sub-accounts' }, httpCode.FORBIDDEN);
    }

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
      if (cacNumber) {
        params.query.cacNumber = cacNumber;
      }
      if (status) {
        params.query.status = status;
      }
      if (country) {
        params.query.country = country;
      }
      if (creatorId) {
        params.query.creatorId = creatorId;
      }
      const result = await this.getAllPaginatedPartners(params);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'partners fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no partner record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query partner collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPartnerById(req, res) {
    const { partnerId } = req.params;

    if (partnerId === undefined) {
      return Response.failure(res, { message: 'partnerId required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { _id: partnerId };
      param.fields = { creatorId: 0, password: 0 };
      const partner = await this.getPartner(param);
      if (partner) {
        return Response.success(res, {
          message: 'partner record successully fetched',
          response: partner,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'partner not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to query partner collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePartnerById(req, res) {
    const { partnerId } = req.params;
    try {
      if (!partnerId) {
        Response.failure(res, { message: 'partnerId is required' }, httpCode.BAD_REQUEST);
        return;
      }
      const partner = await this.updatePartner({ _id: partnerId }, req.body);
      if (partner) {
        Response.success(res, { message: 'partner updated well!!', response: partner }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'partnerId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async setPartnerAccountStatus(req, res) {
    if (req.role !== Constant.SUPER_ADMIN && req.role !== Constant.ADMIN
      && req.role !== Constant.PARTNER_ADMIN && req.role !== Constant.USER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you don\'t have access this resource' }, httpCode.FORBIDDEN);
    }
    const { partnerId, status } = req.query;
    const statuses = ['active', 'inactive'];

    try {
      if (!partnerId) {
        Response.failure(res, { message: 'partnerId is required' }, httpCode.BAD_REQUEST);
        return;
      }

      if (!status || statuses.indexOf(status) === -1) {
        Response.failure(res, { message: 'status is required and takes either active or inactive' }, httpCode.BAD_REQUEST);
        return;
      }
      const message = status === 'active' ? 'active' : 'not active';
      const record = await this.getPartner({ _id: partnerId });
      if (record.status === status) {
        Response.failure(res, { message: `user is already ${message}` }, httpCode.BAD_REQUEST);
        return;
      }
      if (req.role === Constant.PARTNER_ADMIN) {
        if (record && record.role !== 'user') {
          Response.failure(res, { message: 'forbidden! you can only set a partner sub-account' }, httpCode.FORBIDDEN);
          return;
        }
      }
      const action = status === 'active' ? 'activate' : 'deactivate';
      const partner = await this.updatePartner({ _id: partnerId }, { status });
      if (partner) {
        const content = {};
        if (status === 'active') {
          content.body = `<strong>Hello ${partner.firstname}<strong/>,<br />
          Your account has been ${action}d. You can now login into your account.
          <br /><br />
          URL: ${process.env.CLIENT_PARTNER_PORTAL}
          Email: ${partner.email}
          <br /><br />
          Thank you,<br />
          TheNewspaperStand Team`;
        }
        content.body = `<strong>Hello ${partner.firstname}<strong/>,<br />
        Your account has been deactivated. You won’t be able to login into your account. Contact TheNewspaperStand admin or your key account manager.
          <br /><br />
          Sorry for the inconvenience.
          <br /><br />
          Thank you,<br />
          TheNewspaperStand Team`;
        content.subject = `${action.charAt(0).toUpperCase() + action.slice(1)} partner’s account`;
        const mailPayload = {
          email: partner.email,
          subject: content.subject,
          title: `Account ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
          html: emailTemp(content),
        };
        Util.sendMailNotification(mailPayload)
          .then(async (resp) => {
            logger.info(resp);
            logger.info(`you have successfully ${action} the user`);
            await audit.trail(`you have successfully ${action} the user`, 'set account status', req.id);
            return Response.success(res, { message: `you have successfully ${action} the user`, response: partner.email }, httpCode.OK);
          }).catch(async (mailError) => {
            logger.info(mailError);
            logger.info(`you have successfully ${action} the user`);
            await audit.trail(`you have successfully ${action} the user`, 'set account status', req.id);
            return Response.success(res, { message: `you have successfully ${action} the user`, response: partner.email }, httpCode.OK);
          });
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'partnerId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePartnerById(req, res) {
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
      const record = await this.deletePartner({ _id: id });
      if (record) {
        Response.success(res, { message: 'record deleted well!!', response: record }, httpCode.DELETED);
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

  async forgotPassword(req, res) {
    const email = req.body.email.toLowerCase();

    if (!email) {
      Response.failure(res, { message: 'email is required' }, httpCode.BAD_REQUEST);
      return;
    }
    try {
      const record = await this.getPartner({ email });
      if (!record) {
        Response.failure(res, { message: 'email is not found' }, httpCode.NOT_FOUND);
        return;
      }
      const forgotPasswordToken = crypto.randomBytes(20).toString('hex');
      logger.info(forgotPasswordToken);
      const updatedRecord = await this.updatePartner({ _id: record._id }, {
        resetPasswordToken: forgotPasswordToken,
        resetPasswordExpires: Date.now() + 86400000,
      });
      if (updatedRecord) {
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

  async changePassword(req, res) {
    const {
      oldPassword, newPassword, confirmPassword,
    } = req.body;

    const missedFiles = await Util.authenticateParams(req.body, ['oldPassword', 'newPassword', 'confirmPassword']);
    if (missedFiles.length > 0) {
      return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.UNPROCESSED_ENTITY);
    }
    try {
      const record = await this.getPartner({ _id: req.id });
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
      const isPassordCorrect = bcrypt.compareSync(oldPassword, record.password);
      if (isPassordCorrect) {
        const updatedRecord = await this.updatePartner({ _id: req.id }, bodyToUpdate);
        if (updatedRecord) {
          Response.success(res, { message: 'You have successfully changed your password' }, httpCode.OK);
          return;
        }
      }
      return Response.failure(res, { message: 'old password is not correct' }, httpCode.BAD_REQUEST);
    } catch (error) {
      logger.info(error);
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async resetPassword(req, res) {
    const { password, confirmPassword, resetPasswordToken } = req.body;

    const missedFiles = await Util.authenticateParams(req.body, ['password', 'confirmPassword', 'resetPasswordToken']);
    if (missedFiles.length > 0) {
      return Response.failure(res, { message: `bad request! pass the missing fields - (${missedFiles.join(',')})` }, httpCode.BAD_REQUEST);
    }
    if (password !== confirmPassword) {
      Response.failure(res, { message: 'Password does not match' }, httpCode.BAD_REQUEST);
      return;
    }
    try {
      const record = await this.getPartner({
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
      const updatedRecord = await this.updatePartner({ _id: record.id }, bodyToUpdate);
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
          const user = await this.updatePartner({ _id: req.id }, req.body);
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

module.exports = new Partner();
