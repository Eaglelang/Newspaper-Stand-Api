/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-properties */
/* eslint-disable import/order */
/* eslint-disable consistent-return */
/* eslint-disable max-len */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable class-methods-use-this */
const bcrypt = require('bcrypt');
const shortid = require('shortid');
const mailer = require('nodemailer');
const http = require('https');
const AWS = require('aws-sdk');
const config = require('./config');
const axios = require('axios');
const logger = require('./logger');
const { google } = require('googleapis');

const { OAuth2 } = google.auth;
const OAUTH_PLAYGROUND = 'https://developers.google.com/oauthplayground';

AWS.config.update({ accessKeyId: config.s3.accessKey, secretAccessKey: config.s3.secretKey });
// Set your region for future requests.
AWS.config.update({ region: config.s3.region });

const s3 = new AWS.S3();

class Utils {
  async hashPassword(password) {
    const hash = await bcrypt.hashSync(password, 10);
    return hash;
  }

  async generateAdminPassword() {
    return shortid.generate();
  }

  /**
 * Send otp code
 * @param {Object} otpData the payload for otp message
 * @return {Promise} promise
 */

  async sendOTP(otpData) {
    logger.info(otpData);

    return new Promise((resolve, reject) => {
      const payload = {
        to: otpData.recipient,
        from: 'TNS',
        sms: `Your one time code to verify your signup on The Newspaper Stand is ${otpData.token} kindly use it before 2 mins.\nThank You!`,
        type: 'plain',
        api_key: config.sms.apiKey,
        channel: 'generic',
      };
      const stringPayload = JSON.stringify(payload);
      const requestDetails = {
        protocol: 'https:',
        hostname: 'termii.com',
        method: 'POST',
        path: '/api/sms/send',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': stringPayload.length,
        },
      };

      const req = http.request(requestDetails, (res) => {
        const status = res.statusCode;
        if (status === 200 || status === 201) {
          let body = '';
          res.on('data', (data) => {
            body += data;
          });
          return res.on('end', () => {
            logger.info(body);
            return resolve(body);
          });
        }
        let err = '';
        res.on('data', (data) => {
          err += data;
        });
        return res.on('end', () => {
          const parsed = JSON.parse(err);
          const otpError = new Error();
          otpError.statusCode = status;
          otpError.message = parsed.message;
          logger.info(otpError);
          return reject(otpError);
        });
      });

      req.on('error', (e) => {
        logger.info(e);
        reject(e);
      });

      req.write(stringPayload);

      req.end();
    });
  }

  async upInitiateTransactionHandler(payloadObj) {
    logger.info(payloadObj);
    const { amount } = payloadObj;
    const payload = {
      amount,
      currency: 566, // NIgeria currency code
      description: 'payment for funding TNS',
      returnUrl: `${config.appBaseUrl}/v1/payment/unified/response`,
      secretKey: `${config.UP.secretKey}`,
      fee: 0,
    };

    return (await axios.post(`https://test.payarena.com/${config.UP.merchantID}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 12000,
    })).data;
  }

  async checkUPTransactionStatus(transactionId) {
    return (await axios.get(`https://test.payarena.com/Status/${transactionId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 12000,
    })).data;
  }

  //  authenticate request parameters
  async authenticateParams(passedJson, neededFields) {
    const missingFields = [];
    neededFields.forEach((element) => {
      if (!passedJson[element]) {
        missingFields.push(element);
      }
    });
    return missingFields;
  }

  async validateParams(passedJson, neededFields) {
    const excessFields = [];
    Object.keys(passedJson).forEach((element) => {
      if (neededFields.indexOf(element) === -1) {
        excessFields.push(element);
      }
    });
    return excessFields;
  }

  async roundUp(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  async uploadToS3(data, bucketName, key) {
    return new Promise((resolve, reject) => {
      s3.upload({
        Bucket: bucketName,
        Body: data,
        Key: key,
        Expires: 30,
        ACL: 'public-read',
      }, (err, response) => {
        if (err) {
          return reject(err);
        }
        if (response) {
          return resolve(response);
        }
        return reject(err);
      });
    });
  }

  async sendMailNotification(data) {
    const oauth2Client = new OAuth2(
      process.env.MAILING_SERVICE_CLIENT_ID,
      process.env.MAILING_SERVICE_CLIENT_SECRET,
      OAUTH_PLAYGROUND,
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.MAILING_SERVICE_REFRESH_TOKEN,
    });

    const accessToken = await oauth2Client.getAccessToken();

    const smtpTransport = mailer.createTransport({
      service: 'gmail',
      debug: true,
      auth: {
        type: 'OAUTH2',
        user: config.gmail_login.email,
        clientId: process.env.MAILING_SERVICE_CLIENT_ID,
        clientSecret: process.env.MAILING_SERVICE_CLIENT_SECRET,
        refreshToken: process.env.MAILING_SERVICE_REFRESH_TOKEN,
        accessToken,
      },
    });
    const mail = {
      from: `${data.title} <${config.gmail_login.email}>`,
      to: data.email,
      subject: data.subject,
      text: data.body,
      html: data.html ? data.html : '',
      attachments: data.attachments ? data.attachments : '',
    };

    return new Promise((resolve, reject) => {
      smtpTransport.sendMail(mail, (error, info) => {
        if (error) {
          logger.info(error);
          reject(error);
        }
        if (info) {
          logger.info('!!!!!!email sent successfully!!!!!!!!');
          logger.info('Message sent: ', info);
          resolve(info);
        }

        if (smtpTransport !== null) smtpTransport.close();
      });
    });
  }
}

module.exports = new Utils();
