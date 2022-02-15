/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const fs = require('fs');
const Agenda = require('agenda');
const logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const audit = require('../../audits/auditHelper');
const WalletService = require('../../services/users/wallet');
const SubscriptionController = require('../subscription');
const SubscriptionService = require('../../services/subscription');
const { payoutAggregator } = require('../helper');
const emailTemp = require('../../commons/email');
const config = require('../../lib/config');
const Constant = require('../../commons/constants');
const CustomerService = require('../../services/users/customer');
const { payoutExcelHelper } = require('../excelHelper');
const {
  addRevenueOrFundingMoneyToTNSWallet, deductMoneyFromWallet, addMoneyToEveryPartner,
} = require('../helper');

const address = process.env.MONGO_DB_URL;
const collection = process.env.JOB_COLLECTION;
const agenda = new Agenda({ db: { address, collection } });

agenda.define('track subscription status', { priority: 'high', concurrency: 10 }, async (job, done) => {
  logger.info("Running 'track subscription status' process...");
  const { customerId, email, subs } = job.attrs.data;
  try {
    const updatedSub = await new SubscriptionService().updateSubscription({ customerId }, { status: 'inactive' });
    logger.info(`successfully disabled subscription with id ${updatedSub.subscriptionId}`);
    const mailPayload = {
      email,
      subject: 'Your Subscription Validity',
      title: 'Newspaper Stands Subscription',
      body: `Dear ${email}, your subscription has expired.
      Subscription detail: ${subs}`,
    };
    Util.sendMailNotification(mailPayload)
      .then((resp) => {
        logger.info('successfully notified user of subscription expiration', resp);
      }).catch((mailError) => {
        logger.info(`Email Error: ${mailError}`);
      });
    done();
  } catch (error) {
    logger.info('Job running exception!');
    logger.info(error);
    return done(error);
  }
});

agenda.define('send email ahead of expiration', { priority: 'high', concurrency: 10 }, async (job, done) => {
  logger.info("Running 'send email ahead of expiration' process...");
  const { email, subs } = job.attrs.data;
  try {
    const mailPayload = {
      email,
      subject: 'Your Subscription Status',
      title: 'Newspaper Stands Subscription',
      body: `Dear ${email}, your subscription has few hours left to expire, kindly renew it.
        Subscription detail: ${subs}`,
    };
    Util.sendMailNotification(mailPayload)
      .then((resp) => {
        logger.info('successfully notified user of subscription expiration', resp);
      }).catch((mailError) => {
        logger.info(`Email Error: ${mailError}`);
      });
    done();
  } catch (error) {
    logger.info('Job running exception!');
    logger.info(error);
    return done(error);
  }
});

agenda.define('disable isTrial feature of customer', { priority: 'high', concurrency: 10 }, async (job, done) => {
  logger.info("Running 'disabling isTrial feature of customer' process...");
  const { id, email, type } = job.attrs.data;
  try {
    let updatedProfile;
    if (type === 'cooperate') {
      updatedProfile = await new CustomerService().updateCustomerCoopParent({ _id: id }, { isTrial: false });
    } else if (type === 'individual') {
      updatedProfile = await new CustomerService().updateCustomerIndParent({ _id: id }, { isTrial: false });
    } else return false;
    logger.info(`successfully disabled isTrial feature - ${updatedProfile.isTrial}`);
    const content = {};
    content.body = `Hello ${updatedProfile.firstname},<br />
    You have been given 7 days access to TheNewspaperStand.<br /><br />
    Explore, Subscribe, Enjoy and Get digital replicas of your favourite Newspapers and Magazines seamlessly delivered to you on your web and mobile devices from Nigeria's leading newspaper and magazine titles.
    <br /><br />
    Happy Reading,<br />
    TheNewspaperStand Team`;
    content.subject = 'Freemium Package Initiation by customer';
    const mailPayload = {
      email,
      subject: content.subject,
      title: 'Enjoy 7 Days Access to TheNewspaperStand.',
      html: emailTemp(content),
    };
    Util.sendMailNotification(mailPayload)
      .then((resp) => {
        logger.info('successfully notified customer about freemium expiration', resp);
      }).catch((mailError) => {
        logger.info(`Email Error: ${mailError}`);
      });
    done();
  } catch (error) {
    logger.info('Job running exception!');
    logger.info(error);
    return done(error);
  }
});

agenda.define('schedule payout time', { priority: 'high', concurrency: 10 }, async (job, done) => {
  logger.info("Running 'schedule payout time...");
  const aggregation = await payoutAggregator;
  logger.info(aggregation);
  const filename = `payout${Date.now()}.xlsx`;
  await payoutExcelHelper(aggregation, filename);
  try {
    const mailPayload = {
      email: 'abass@blusalt.net',
      subject: 'Partner Payout',
      title: 'Newspaper Stands',
      body: 'Dear TNS, attached to this is the list partners to pay for this month',
      attachments: [
        {
          filename,
          path: `${__dirname}/${filename}`,
          cid: 'uniq-mailtrap.png',
        },
      ],
    };
    Util.sendMailNotification(mailPayload)
      .then(() => {
        fs.unlinkSync(`${__dirname}/${filename}`);
        logger.info('successfully notified admin of the payout that will happen');
      }).catch((mailError) => {
        if (fs.existsSync(filename)) fs.unlinkSync(`${__dirname}/${filename}`);
        logger.info(`Email Error: ${mailError}`);
      });
    done();
  } catch (error) {
    if (fs.existsSync(filename)) fs.unlinkSync(`${__dirname}/${filename}`);
    logger.info('Job running exception!');
    logger.info(error);
    return done(error);
  }
});

agenda.define('make subscription recurring', { priority: 'high', concurrency: 10 }, async (job, done) => {
  logger.info('Running subscription recurring...');
  const { data } = job.attrs;
  try {
    const walletObject = await new WalletService().getCustomerWallet({ userId: data.userId });
    if (walletObject.amount < data.subscription.subscriptionCost) {
      logger.info('you auto renews has failed due to low funds in your wallet! kindly fund and try again');
      // notify customer about this
      await agenda.stop();
      const content = {};
      content.body = `Hello <strong>${data.firstname}</strong>,<br />
      Your  ${data.subscription.duration} subscription to ${data.subscription.productId.join(' and ')} @ ${data.subscription.subscriptionCost} ${data.subscription.duration} has failed due to low balance in your wallet.
      <br /><br />
      kindly fund your wallet and try subscribe again
      <br /><br />
      Thank you,<br />
      TheNewspaperStand Team`;
      content.subject = 'Subscription Renewal Failed';
      const mailPayload = {
        email: data.email,
        subject: content.subject,
        title: 'New subscription Renewal Failed',
        html: emailTemp(content),
      };
      Util.sendMailNotification(mailPayload)
        .then((resp) => {
          logger.info('successfully notified user about subscription autorenews failure', resp);
          return false;
        }).catch((mailError) => {
          logger.info(`Email Error: ${mailError}`);
          return false;
        });
    }
    const subsData = {
      customerId: data.subscription.customerId,
      productId: data.subscription.productId,
      subscriptionCost: data.subscription.subscriptionCost,
      country: data.subscription.country,
      userType: data.subscription.userType,
      recurring: data.subscription.recurring,
      device: data.subscription.device,
      subscriptionType: data.subscription.subscriptionType,
      duration: data.subscription.duration,
      dateOfSubscription: new Date(Date.now()),
      endOfSubscriptionDate: new Date(Date.now() + data.timeGap),
    };
    await deductMoneyFromWallet(data.subscription.subscriptionCost, data.userId);
    await addRevenueOrFundingMoneyToTNSWallet(data.revenue, config.TNS.walletId, Constant.NAIRA, false);
    const productNames = await addMoneyToEveryPartner(data.subscription.productId, Constant.NAIRA, data.multiplier);
    // credit blusalt wallet if it is first of the month
    const isFirstTime = await SubscriptionController.isFirstSubOfTheMonth(data.userId);
    if (isFirstTime) SubscriptionController.creditBlusaltWallet(data.userId);
    const subscription = await new SubscriptionService().addSubscription(subsData);
    const jobStatementDuration = await subsData.duration.substring(0, subsData.duration.length - 2);
    // eslint-disable-next-line no-use-before-define
    new Scheduler().trackSubscriptionStatus(jobStatementDuration, subscription.customerId, data.email, subscription);
    logger.info('successfully renewed the subscription');
    await audit.trail('Product Subscription', 'Subscription successfully auto-renews', data.userId, subscription);
    const content = {};
    content.body = `Hello <strong>${data.firstname}</strong>,<br />
    Your  ${data.subscription.duration} subscription to ${productNames.join(' and ')} @ ${subscription.subscriptionCost} ${subscription.duration} has just been renewed.
    <br /><br />
    Your subscription will still be auto-renews ${subscription.endOfSubscriptionDate}<br />
    Login to start reading!
    <br /><br />
    Thank you,<br />
    TheNewspaperStand Team`;
    content.subject = 'Subscription Renewal';
    const mailPayload = {
      email: data.email,
      subject: content.subject,
      title: `New subscription to ${subscription.subscriptionType}`,
      html: emailTemp(content),
    };
    Util.sendMailNotification(mailPayload)
      .then((resp) => {
        logger.info('successfully notified user about subscription', resp);
      }).catch((mailError) => {
        logger.info(`Email Error: ${mailError}`);
      });
    done();
  } catch (error) {
    logger.info('Job running exception!');
    logger.info(error);
    return done(error);
  }
});

class Scheduler {
  async trackSubscriptionStatus(timeIntervalInString, customerId, email, subs) {
    agenda.start();
    agenda.schedule(timeIntervalInString, 'track subscription status', { customerId, email, subs });
    logger.info('Track Subscription Status Agenda Started!');
  }

  async sendMailAheadOfSubscriptionExpirationTime(timeIntervalInString, email, subs) {
    agenda.start();
    agenda.schedule(timeIntervalInString, 'send email ahead of expiration', { email, subs });
    logger.info('Email Ahead of Expiration Agenda Started!');
  }

  async deactiveIsTrialFeautureAfter7Days(id, email, type) {
    agenda.start();
    agenda.schedule('7 days', 'disable isTrial feature of customer', { id, email, type });
    logger.info('Disable isTrial Feature Agenda Started!');
  }

  async schedulePayoutTime() {
    const monthly = agenda.create('schedule payout time');
    agenda.start();
    monthly.repeatEvery('1 month', {
      skipImmediate: true,
    }).save();
    logger.info('Schedule Payout Time Agenda Started!!!');
  }

  async subscriptionRecurringEngine(duration, subscriptionData) {
    const timeInWord = await duration.substring(0, duration.length - 2);
    const monthly = agenda.create('make subscription recurring', subscriptionData);
    agenda.start();
    monthly.repeatEvery(timeInWord, {
      skipImmediate: true,
    }).save();
    logger.info('make subscription recurring!!!');
  }
}

module.exports = new Scheduler();
