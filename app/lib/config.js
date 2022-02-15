/* eslint-disable no-undef */
const Constant = require('../commons/constants');

const appName = 'newspaper stand';

const config = {
  appName,
  appBaseUrl: process.env.APP_BASE_URL,
  port: process.env.PORT || 3000,
  host: '127.0.0.1',
  outputDir: `${__dirname.replace('app/config', 'logs')}/`,
  otpSecret: process.env.OTP_SECRET,
  currentDurationId: process.env.CURRENT_DURATION_ID || 'currentdiscountpercentageid',
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
  sms: {
    apiKey: process.env.API_KEY,
  },
  UP: {
    merchantID: process.env.UP_MERCHANTID,
    secretKey: process.env.UP_SECRET_KEY,
  },
  TNS: {
    walletId: process.env.TNS_WALLET_ID || Constant.TNS_WALLET_ID,
  },
  otp: {
    sender: process.env.OTP_SENDER,
    username: process.env.OTP_USERNAME,
    password: process.env.OTP_PASSWORD,
  },
  mongo: {
    connection: {
      host: process.env.MONGODB_HOST,
      username: process.env.MONGODB_USER,
      password: process.env.MONGODB_PASSWORD,
      port: process.env.MONGODB_PORT,
      dbProd: process.env.MONGODB_DATABASE_NAME,
    },
    collections: {
      user: process.env.USER_COLLECTION,
      partner: process.env.PARTNER_COLLECTION,
      partnerBank: process.env.PARTNER_BANK_COLLECTION,
      settlement: process.env.SETTLEMENT_COLLECTION,
      settlementSetting: process.env.SETTLEMENT_SETTING_COLLECTION,
      otp: process.env.OTP_COLLECTION,
      setting: process.env.SETTING_COLLECTION || 'setting',
      tnsWallet: process.env.TNS_WALLET_COLLECTION,
      partnerWallet: process.env.PARTNER_WALLET_COLLECTION,
      customer: {
        wallet: process.env.CUSTOMER_WALLET_COLLECTION,
        individual: {
          parent: process.env.CUSTOMER_IND_PARENT_COLLECTION,
          child: process.env.CUSTOMER_IND_CHILD_COLLECTION,
        },
        cooperate: {
          parent: process.env.CUSTOMER_COOP_PARENT_COLLECTION,
          child: process.env.CUSTOMER_COOP_CHILD_COLLECTION,
        },
      },
      product: process.env.PRODUCT_COLLECTION,
      bundle: process.env.BUNDLE_COLLECTION,
      coupon: process.env.COUPON_COLLECTION || 'coupon',
      subscription: process.env.SUBSCRIPTION_COLLECTION || 'subscription',
      transaction: process.env.TRANSACTION_COLLECTION,
      duration: process.env.DURATION_COLLECTION,
    },
    queryLimit: process.env.MONGODB_QUERY_LIMIT,
    adminLimit: process.env.QUESTION_LIMIT,
  },
  gmail_login: {
    email: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
  s3: {
    accessKey: process.env.AWS_S3_ACCESS_KEY,
    secretKey: process.env.AWS_S3_SECRET_KEY,
    region: process.env.AWS_REGION,
  },
};
module.exports = config;
