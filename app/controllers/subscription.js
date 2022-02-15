/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const Response = require('../commons/response');
const httpCode = require('../commons/httpCode');
const SubscriptionSchema = require('../schema/subscription');
const DurationSchema = require('../schema/duration');
const SubscriptionService = require('../services/subscription');
const CustomerCooperateService = require('../services/users/customer');
const WalletSubscription = require('../services/users/wallet');
const BundleService = require('../services/bundle');
const CouponController = require('./coupon');
const WalletService = require('../services/users/wallet');
const audit = require('../audits/auditHelper');
const logger = require('../lib/logger');
const Constant = require('../commons/constants');
const config = require('../lib/config');
const Util = require('../lib/utils');
const emailTemp = require('../commons/email');
const {
  calculateTotalMoneyForProducts, addRevenueOrFundingMoneyToTNSWallet,
  calculateProductCostMoney, deductMoneyFromWallet,
  addMoneyToEveryPartner,
} = require('./helper');

class Subscription extends SubscriptionService {
  // this is for local customers
  async productSubscription(req, res) {
    const { userType } = req.query;
    const durationList = ['weekly', 'monthly', 'quarterly'];
    const userRoles = ['cooperate', 'individual', 'childcoop', 'childind'];

    if (!userType) {
      return Response.failure(res, { message: 'userType is required as query param' }, httpCode.BAD_REQUEST);
    }

    if (userRoles.indexOf(userType) === -1) {
      return Response.failure(res, { message: 'invalid userType' }, httpCode.BAD_REQUEST);
    }
    // valid request body for subscription to be made
    await SubscriptionSchema.createProductSubscription.validateAsync(req.body);

    let { duration } = req.body;
    const { couponCode, freemium } = req.body;

    if (durationList.indexOf(duration) === -1) {
      logger.info(duration);
      return Response.failure(res, { message: 'duration must be one of (weekly, monthly, quarterly)' }, httpCode.BAD_REQUEST);
    }

    try {
      let user;
      let isFreemiumAllowed = false;
      if (userType === 'cooperate') user = await new CustomerCooperateService().getCustomerCoopParent({ _id: req.id });

      if (userType === 'individual') user = await new CustomerCooperateService().getCustomerIndParent({ _id: req.id });

      if (userType === 'childcoop') user = await new CustomerCooperateService().getCustomerCoopChild({ _id: req.id });

      if (userType === 'childind') user = await new CustomerCooperateService().getCustomerIndChild({ _id: req.id });

      if (!user) return Response.failure(res, { message: 'customer not found' }, httpCode.NOT_FOUND);

      if (freemium) {
        if (userType === 'childind' || userType === 'childcoop') {
          return Response.failure(res, { message: 'freemium package is only available for a parent account' }, httpCode.BAD_REQUEST);
        }
        isFreemiumAllowed = await user.isTrial;
        if (!isFreemiumAllowed) {
          logger.info(isFreemiumAllowed);
          logger.info('freemium has already been used by the user');
          return Response.failure(res, { message: 'freemium package has been used' }, httpCode.BAD_REQUEST);
        }
        duration = 'weekly';
        // resetting on the parent object to affirm it in the subscription record
        req.body.duration = 'weekly';
        await audit.trail('Freemium Package', 'User successfully used his/her freemium package', req.id, user);
        const mailPayload = {
          email: user.email,
          subject: 'Your Freemium Package',
          title: 'Newspaper Stands Subscription',
          body: `Dear ${user.email}, Thank you for choosing us, you have successfully used your one time freemium package`,
        };
        await Util.sendMailNotification(mailPayload);
        logger.info('user is using the freemium package');
        logger.info(`****${duration}**** is the duration set for the freemium package`);
      }

      if (user.country && user.country.toLowerCase() !== Constant.LOCAL) {
        return Response.failure(res, { message: 'only local customer is allowed' }, httpCode.FORBIDDEN);
      }

      const durationDiscountInPercentage = await this.getDuration({ durationId: config.currentDurationId });
      if (!durationDiscountInPercentage) {
        return Response.failure(res, { message: 'discount percentage is not found in db, try again later' }, httpCode.FORBIDDEN);
      }

      let discount = 0;
      let timeGap;
      let multiplier = 1;
      let jobStatementDuration = '';
      let jobStatementEmailAhead = '';

      switch (duration) {
        case 'daily':
          timeGap = 86400000;
          discount = 0;
          multiplier = 1;
          jobStatementDuration = '1 day';
          jobStatementEmailAhead = '23 hours';
          break;
        case 'weekly':
          timeGap = 86400000 * 7;
          multiplier = 7;
          discount = durationDiscountInPercentage.weekly;
          jobStatementDuration = '1 week';
          jobStatementEmailAhead = '6 days';
          break;
        case 'monthly':
          timeGap = 86400000 * 30;
          multiplier = 30;
          discount = durationDiscountInPercentage.monthly;
          jobStatementDuration = '1 month';
          jobStatementEmailAhead = '29 days';
          break;
        case 'quarterly':
          timeGap = 86400000 * 90;
          multiplier = 90;
          discount = durationDiscountInPercentage.quarterly;
          jobStatementDuration = '3 months';
          jobStatementEmailAhead = '89 days';
          break;
        default:
          timeGap = 0;
          multiplier = 1;
          discount = 0;
      }

      const arrayOfProductIds = req.body.productId;

      let totalAmount = await calculateTotalMoneyForProducts(arrayOfProductIds, multiplier, discount);
      const partnerMoney = await calculateProductCostMoney(arrayOfProductIds, multiplier);
      if (totalAmount === 0 || partnerMoney === 0) {
        return Response.failure(res, { message: 'product not exists or not active' }, httpCode.NOT_FOUND);
      }

      let id = req.id;
      if (userType === 'childcoop') id = user.businessId;
      if (userType === 'childind') id = user.parentCustomerId;
      logger.info(id);
      const walletInfo = await new WalletSubscription().getCustomerWallet({ userId: id });
      logger.info(walletInfo);
      if (!walletInfo) {
        return Response.failure(res, { message: 'seems your wallet not found, try again please' }, httpCode.NOT_FOUND);
      }

      if (couponCode) {
        logger.info(couponCode);
        const isCouponActive = await CouponController.isCouponStillAvailableForProduct(arrayOfProductIds[0], couponCode);
        if (isCouponActive.status) {
          logger.info(isCouponActive);
          const value = await CouponController.getCouponValue(couponCode, (arrayOfProductIds[0]));
          if (value !== null) {
            logger.info(value);
            totalAmount -= value;
            const updatedCoupon = await CouponController.incrementCouponCount({ couponCode }, { count: 1 });
            logger.info(updatedCoupon);
          }
        }
      }
      logger.info(`wallet balance for customer ${walletInfo.amount}`);
      logger.info(`partner money for publication cost ${partnerMoney}`);
      logger.info(`total amount calculated is ${totalAmount}`);
      if (!isFreemiumAllowed) {
        if (walletInfo.amount < totalAmount) {
          return Response.failure(res, { message: 'insufficient money! kindly fund your wallet and try again' }, httpCode.NOT_ACCEPTABLE);
        }
      }

      logger.info(req.body.productId);
      const isSubStillActiveForCustomer = await this.getSubscription({ productId: req.body.productId, customerId: req.id });
      if (isSubStillActiveForCustomer) {
        const response = await this.checkCurrentSubscriptionActiveness(isSubStillActiveForCustomer);
        logger.info(`subscription status time ===> ${response}`);
        if (response) {
          return Response.failure(res, {
            message: `you have an active subscription for this service that was initiated at ${isSubStillActiveForCustomer.dateOfSubscription}`,
            response: `your subscription expires at ${isSubStillActiveForCustomer.endOfSubscriptionDate}`,
          }, httpCode.NOT_ACCEPTABLE);
        }
      }
      // setting subscription type automatically
      req.body.subscriptionType = 'singleProduct';
      req.body.dateOfSubscription = new Date(Date.now());
      req.body.endOfSubscriptionDate = new Date(Date.now() + timeGap);
      req.body.subscriptionCost = totalAmount;
      req.body.userType = userType;
      req.body.country = user.country ? user.country : '';
      if (isFreemiumAllowed) req.body.productId.length = 1;
      // getting the customerId/subscriberId from the auth middleware
      req.body.customerId = req.id;
      const amount = (totalAmount - partnerMoney);
      await deductMoneyFromWallet(totalAmount, id);
      await addRevenueOrFundingMoneyToTNSWallet(amount, config.TNS.walletId, Constant.NAIRA, false);
      const productNames = await addMoneyToEveryPartner(arrayOfProductIds, Constant.NAIRA, multiplier);

      // credit Blusalt wallet for wallet service charge
      const isFirstTime = await this.isFirstSubOfTheMonth(req.id);
      if (isFirstTime) await this.creditBlusaltWallet(req.id);

      const subscription = await this.addSubscription(req.body);
      if (subscription) {
        // eslint-disable-next-line global-require
        const Scheduler = require('./jobs/agender');
        await audit.trail('successfully subscribed for product', 'Product Subscription', req.id);
        if (req.body.recurring) {
          const recurringSubData = {
            userId: id,
            partnerMoney,
            multiplier,
            firstname: user.firstname,
            email: user.email,
            revenue: amount,
            timeGap,
            subscription,
          };
          // set job for recurring billing
          await Scheduler.subscriptionRecurringEngine(duration, recurringSubData);
        }
        // set a job to set subscription status inactive
        await Scheduler.trackSubscriptionStatus(jobStatementDuration, subscription.customerId, user.email, subscription);
        // remind them only if the subscription is not auto renews
        if (!req.body.recurring) {
          await Scheduler.sendMailAheadOfSubscriptionExpirationTime(jobStatementEmailAhead, user.email, subscription);
        }
        const content = {};
        const walletBalance = walletInfo.amount - Number(subscription.subscriptionCost);
        content.body = `Hello <strong>${user.firstname}</strong>,<br />
        You have just subscribed  ${subscription.duration} to ${productNames.join(' and ')} @ ${subscription.subscriptionCost} ${subscription.duration}.
        <br /><br />
        Your wallet before: ${walletInfo.amount} NGN<br />
        Your wallet balance: ${await Util.roundUp(walletBalance)} NGN
        <br /><br />
        Your subscription will be auto-renews ${subscription.endOfSubscriptionDate}<br />
        Login to start reading!
        <br /><br />
        Thank you,<br />
        TheNewspaperStand Team`;
        content.subject = 'Customer subscription';
        const mailPayload = {
          email: user.email,
          subject: content.subject,
          title: `New subscription to ${subscription.subscriptionType}`,
          html: emailTemp(content),
        };
        Util.sendMailNotification(mailPayload)
          .then((resp) => {
            logger.info('successfully notified user about subscription', resp);
            return Response.success(res, { message: `${duration} option subscription has been made successfully`, response: subscription }, httpCode.CREATED);
          }).catch((mailError) => {
            logger.info(`Email Error: ${mailError}`);
            return Response.success(res, { message: `${duration} option subscription has been made successfully`, response: subscription }, httpCode.CREATED);
          });
      }
    } catch (error) {
      console.log(error);
      if (error.msg && error.msg.name === 'CastError') {
        return Response.failure(res, { message: 'an error occured', response: 'productId passed seems not correct' }, httpCode.BAD_REQUEST);
      }
      return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  // INTERNATIONAL - paypal postback recieved from client!!!!!
  async bundleSubscription(req, res) {
    logger.info(req.role);

    const { userType } = req.query;
    const durationList = ['daily', 'weekly', 'monthly', 'quarterly'];
    const {
      paymentStatus, transactionId, provider,
    } = req.body;
    let { amountPaid } = req.body;
    let currency = '';

    if (!transactionId) {
      return Response.failure(res, { message: 'transactionId is required for this transaction' }, httpCode.BAD_REQUEST);
    }

    if (!provider) {
      return Response.failure(res, { message: 'provider is required' }, httpCode.BAD_REQUEST);
    }

    if (provider !== 'paypal' && provider !== 'unified') {
      return Response.failure(res, { message: 'provider name: either paypal or unified is expected' }, httpCode.BAD_REQUEST);
    }

    if (provider === 'unified') {
      // check status with transactionId
      const data = await Util.checkUPTransactionStatus(transactionId);
      logger.info(data);
      if (!data) {
        return Response.failure(res, { message: 'try again later! Cant process the payment made' }, httpCode.UNPROCESSED_ENTITY);
      }
      if (data && data.Status !== 'APPROVED') {
        return Response.failure(res, { message: 'the payment made was not successful, try again or kindly contact admin' }, httpCode.UNPROCESSED_ENTITY);
      }

      if (data && data.Amount) {
        amountPaid = data.Amount;
        switch (data.Currency) {
          case 566:
            currency = Constant.NAIRA;
            break;
          case 840:
            currency = Constant.DOLLAR;
            break;
          case 978:
            currency = Constant.EURO;
            break;
          case 826:
            currency = Constant.POUNDS;
            break;
          default:
            currency = '';
        }
      }
    }
    if (provider === 'paypal') {
      if (paymentStatus === null) {
        return Response.failure(res, { message: 'kindly pass paymentStatus for this transaction' }, httpCode.BAD_REQUEST);
      }

      if (paymentStatus === false || amountPaid <= 0) {
        return Response.failure(res, { message: 'payment made for this transaction is not successful' }, httpCode.BAD_REQUEST);
      }
    }

    if (!userType) {
      return Response.failure(res, { message: 'userType is required as query param' }, httpCode.BAD_REQUEST);
    }

    if (userType !== 'cooperate' && userType !== 'individual') {
      return Response.failure(res, { message: 'userType can either be cooperate or individual' }, httpCode.BAD_REQUEST);
    }

    // valid request body for subscription to be made
    await SubscriptionSchema.createBundleSubscription.validateAsync(req.body);

    const { duration, couponCode } = req.body;

    if (durationList.indexOf(duration) === -1) {
      return Response.failure(res, { message: 'duration must be one of (daily, weekly, monthly, quarterly)' }, httpCode.BAD_REQUEST);
    }

    if (duration === 'daily' || duration === 'weekly') {
      return Response.failure(res, { message: 'minimum duration for bundle is monthly' }, httpCode.BAD_REQUEST);
    }

    try {
      let user;
      let totalAmount = 0;
      if (userType === 'cooperate') {
        user = await new CustomerCooperateService().getCustomerCoopParent({ _id: req.id });
      }

      if (userType === 'individual') {
        user = await new CustomerCooperateService().getCustomerIndParent({ _id: req.id });
      }

      if (!user) {
        return Response.failure(res, { message: 'customer not found' }, httpCode.NOT_FOUND);
      }

      if (user.country.toLowerCase() === Constant.LOCAL) {
        return Response.failure(res, { message: 'this is only for international customer' }, httpCode.FORBIDDEN);
      }

      const durationDiscountInPercentage = await this.getDuration({ durationId: config.currentDurationId });
      let discount = 0;
      let timeGap;
      let multiplier = 1;
      let jobStatementDuration = '';
      let jobStatementEmailAhead = '';

      switch (duration) {
        case 'monthly':
          timeGap = 86400000 * 30;
          multiplier = 30;
          discount = durationDiscountInPercentage.monthly;
          jobStatementDuration = '1 month';
          jobStatementEmailAhead = '29 days';
          break;
        case 'quarterly':
          timeGap = 86400000 * 90;
          multiplier = 90;
          discount = durationDiscountInPercentage.quarterly;
          jobStatementDuration = '3 months';
          jobStatementEmailAhead = '89 days';
          break;
        default:
          timeGap = 0;
          multiplier = 1;
          discount = 0;
      }

      const { bundleId, productId } = req.body;
      const arrayOfProductIds = productId;
      const partnerMoney = await calculateProductCostMoney(arrayOfProductIds, multiplier);
      const bundle = await new BundleService().getBundle({ _id: bundleId, status: 'active' });
      if (bundle) {
        totalAmount += (bundle.priceOfBundle * multiplier) - (bundle.priceOfBundle * discount);
        if (couponCode) {
          logger.info(couponCode);
          const isCouponActive = await CouponController.isCouponStillAvailableForProduct(arrayOfProductIds[0], couponCode);
          if (isCouponActive.status) {
            logger.info(isCouponActive);
            const value = await CouponController.getCouponValue(couponCode, (arrayOfProductIds[0]));
            if (value !== null) {
              logger.info(value);
              totalAmount -= value;
            }
          }
        }
      }

      logger.info(`total amount calculated ${totalAmount} for ${bundleId}`);

      if (amountPaid < totalAmount) {
        // initiate refund
        return Response.failure(res, { message: 'the money paid is not sufficient for this subscription' }, httpCode.NOT_ACCEPTABLE);
      }

      const isSubStillActiveForCustomer = await this.getSubscription({ bundleId, customerId: req.id });
      if (isSubStillActiveForCustomer) {
        const response = await this.checkCurrentSubscriptionActiveness(isSubStillActiveForCustomer);
        logger.info(`response from check subscription time is ${response}`);
        if (response) {
          return Response.failure(res, {
            message: `you have an active subscription for this service that was initiated at ${isSubStillActiveForCustomer.dateOfSubscription}`,
            response: `your subscription expires at ${isSubStillActiveForCustomer.endOfSubscriptionDate}`,
          }, httpCode.NOT_ACCEPTABLE);
        }
      }
      // setting subscription type automatically
      req.body.subscriptionType = 'bundle';
      req.body.dateOfSubscription = new Date(Date.now());
      req.body.endOfSubscriptionDate = new Date(Date.now() + timeGap);
      req.body.subscriptionCost = totalAmount;
      req.body.country = user.country;
      delete req.body.amountPaid;
      delete req.body.paymentStatus;
      const amount = (totalAmount - partnerMoney);
      await addRevenueOrFundingMoneyToTNSWallet(amount, config.TNS.walletId, currency, false);
      await addMoneyToEveryPartner(arrayOfProductIds, currency);
      // getting the customerId/subscriberId from the auth middleware
      req.body.customerId = req.id;
      const subscription = await this.addSubscription(req.body);
      if (subscription) {
        // eslint-disable-next-line global-require
        const Scheduler = require('./jobs/agender');
        await audit.trail('Product Subscription', 'successfully subscribed for bundle', req.id, subscription);
        await Scheduler.trackSubscriptionStatus(jobStatementDuration, subscription.customerId, user.email, subscription);
        await Scheduler.sendMailAheadOfSubscriptionExpirationTime(jobStatementEmailAhead, user.email, subscription);

        const mailPayload = {
          email: user.email,
          subject: 'Your Subscription Validity',
          title: 'Newspaper Stands Subscription',
          body: `Dear ${user.email}, your subscription is successfully made .
          Subscription detail: ${subscription}`,
        };
        Util.sendMailNotification(mailPayload)
          .then((resp) => {
            logger.info('successfully notified user about subscription', resp);
            return Response.success(res, { message: `${duration} option subscription has been made successfully`, response: subscription }, httpCode.CREATED);
          }).catch((mailError) => {
            logger.info(`Email Error: ${mailError}`);
            return Response.success(res, { message: `${duration} option subscription has been made successfully`, response: subscription }, httpCode.CREATED);
          });
      }
    } catch (error) {
      if (error.msg && error.msg.name === 'CastError') {
        return Response.failure(res, { message: 'an error occured', response: 'bundleId passed seems not correct' }, httpCode.BAD_REQUEST);
      }
      return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllSubscription(req, res) {
    logger.info(req.role);
    const {
      page, sort, limit, customerId, subscriptionType, status, productId,
    } = req.query;
    try {
      const params = {
        sort: sort || { createdAt: '-1' },
        page,
        limit,
      };

      params.query = {};
      params.select = '';

      if (customerId) params.query.customerId = customerId;
      if (status) params.query.status = status;
      if (productId) params.query.productId = productId;
      if (subscriptionType) params.query.subscriptionType = subscriptionType;

      const result = await this.getAllPaginatedSubscriptions(params);
      await audit.trail('successfully viewed all subscription on the system', 'subscription view', req.id);
      if (result.docs.length > 0) {
        return Response.success(res, {
          message: 'subscription fetched successfully',
          response: result,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no subscription record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query subscription collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getTotalRevenueGraph(req, res) {
    logger.info(req.role);
    const array = [];
    let totalRevenue = 0;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    try {
      const result = await this.getSpecificSubscription('year');
      // eslint-disable-next-line array-callback-return
      months.map((element, index) => {
        let total = 0;
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < result.length; i++) {
          const month = new Date(result[i].dateOfSubscription).getMonth();
          if (index === month) {
            total += Number(result[i].subscriptionCost);
            totalRevenue += Number(result[i].subscriptionCost);
          }
        }
        array.push({ month: element, total });
      });
      return Response.success(res, {
        message: 'total revenue fetched successfully',
        response: { total: totalRevenue, data: array },
      }, httpCode.OK);
    } catch (error) {
      console.log(error);
      return Response.failure(res, { message: 'unable to query subscription collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getTotalRevenueByDevice(req, res) {
    const array = [];
    let totalRevenue = 0;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    try {
      const result = await this.getSpecificSubscription('year');
      // eslint-disable-next-line array-callback-return
      months.map((element, index) => {
        let pwa = 0; let android = 0; let ios = 0;
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < result.length; i++) {
          const month = new Date(result[i].dateOfSubscription).getMonth();
          if (index === month) {
            if (result[i].device === 'pwa') pwa += Number(result[i].subscriptionCost);
            if (result[i].device === 'android') android += Number(result[i].subscriptionCost);
            if (result[i].device === 'ios') ios += Number(result[i].subscriptionCost);
            totalRevenue += Number(result[i].subscriptionCost);
          }
        }
        array.push({ month: element, device: { pwa, android, ios } });
      });
      return Response.success(res, {
        message: 'revenue by device fetched successfully',
        response: { total: totalRevenue, data: array },
      }, httpCode.OK);
    } catch (error) {
      console.log(error);
      return Response.failure(res, { message: 'unable to query subscription collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async checkCurrentSubscriptionActiveness(isActive) {
    const expiringTime = isActive.endOfSubscriptionDate;
    const endDate = new Date(expiringTime);
    const currentDate = new Date();
    let difference = endDate.getTime() - currentDate.getTime();
    const totalSecond = Math.floor(difference / 1000);
    const daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDifference * 1000 * 60 * 60 * 24;

    const hoursDifference = Math.floor(difference / 1000 / 60 / 60);
    difference -= hoursDifference * 1000 * 60 * 60;

    const minutesDifference = Math.floor(difference / 1000 / 60);
    difference -= minutesDifference * 1000 * 60;
    logger.info(`remainning subscription time in secs - ${totalSecond}`);
    if (totalSecond > 10) {
      logger.info(`remainning subscription time in secs - ${totalSecond}`);
      return true;
    }
    return false;
  }

  async isFirstSubOfTheMonth(customerId) {
    let flag = true;
    const param = {};
    param.conditions = { customerId };
    const subs = await this.getAllSubscriptionsWithCondition(param);
    subs.forEach((element) => {
      const currentMonth = new Date().getMonth();
      const seenMonth = new Date(element.createdAt).getMonth();
      const currentYear = new Date().getFullYear();
      const seenYear = new Date(element.createdAt).getFullYear();
      if (seenYear === currentYear && currentMonth === seenMonth) flag = false;
    });
    return flag;
  }

  async creditBlusaltWallet(id) {
    // credit blusalt wallet
    const walletObject = await new WalletService().getCustomerWallet({ userId: Constant.BLUSALT_WALLET_ID });
    if (!walletObject) await new WalletService().addCustomerWallet({ userId: Constant.BLUSALT_WALLET_ID });
    const newAmount = walletObject.amount + Constant.BLUSALT_WALLET_CHARGE;
    const blusalt = await new WalletService().updateWallet({ userId: Constant.BLUSALT_WALLET_ID },
      { amount: await Util.roundUp(newAmount) });
    logger.info(`blusalt monthly wallet service was charged, blusalt balance: ${blusalt}`);
    await audit.trail('Wallet Credit', 'blusalt monthly wallet service was charged', id);
  }

  async getMoneyForSelectedProduct(req, res) {
    const durationDiscountInPercentage = await this.getDuration({ durationId: config.currentDurationId });
    logger.info(durationDiscountInPercentage);
    let discount = 0;
    let multiplier = 1;
    const { duration, couponCode } = req.body;

    switch (duration) {
      case 'daily':
        discount = 0;
        multiplier = 1;
        break;
      case 'weekly':
        multiplier = 7;
        discount = durationDiscountInPercentage.weekly;
        break;
      case 'monthly':
        multiplier = 30;
        discount = durationDiscountInPercentage.monthly;
        break;
      case 'quarterly':
        multiplier = 90;
        discount = durationDiscountInPercentage.quarterly;
        break;
      default:
        multiplier = 1;
        discount = 0;
    }

    const arrayOfProductIds = req.body.productId;
    let totalAmount = await calculateTotalMoneyForProducts(arrayOfProductIds, multiplier, discount);
    const exact = totalAmount;
    let couponValue = 0;
    if (couponCode) {
      logger.info(couponCode);
      const isCouponActive = await CouponController.isCouponStillAvailableForProduct(arrayOfProductIds[0], couponCode);
      if (isCouponActive.status) {
        logger.info(isCouponActive);
        const value = await CouponController.getCouponValue(couponCode, (arrayOfProductIds[0]));
        if (value !== null) {
          logger.info(value);
          couponValue = value;
          totalAmount -= value;
          return Response.success(res, {
            message: 'price of products selected fetched',
            response: {
              oroginalPrice: exact,
              withCouponUsed: totalAmount,
              couponValue,
            },
          }, httpCode.OK);
        }
        return Response.success(res, {
          message: 'price of products selected fetched',
          response: {
            note: 'couponCode is not valid, try again',
            productPrice: exact,
          },
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'price of products selected fetched',
        response: {
          note: 'couponCode is not active again',
          productPrice: exact,
        },
      }, httpCode.OK);
    }

    return Response.success(res, {
      message: 'price of products selected fetched',
      response: {
        productPrice: exact,
      },
    }, httpCode.OK);
  }

  async subscriberByCountry(req, res) {
    const countryHolder = [];
    const map = {};
    try {
      const result = await this.getAllSubscriptions();
      if (result.length > 0) {
        result.forEach((element) => {
          countryHolder.push(element.country);
        });
        logger.info(countryHolder);
        countryHolder.forEach((country) => {
          if (!map[country]) {
            map[country] = 1;
          } else {
            // eslint-disable-next-line no-plusplus
            map[country]++;
          }
        });

        const sortable = [];
        // eslint-disable-next-line array-callback-return
        Object.keys(map).map(((country) => {
          sortable.push([country, map[country]]);
        }));

        sortable.sort((a, b) => b[1] - a[1]);
        sortable.length = 6;

        const mapSorted = {};
        sortable.forEach((item) => {
          mapSorted[item[0]] = item[1];
        });
        return Response.success(res, {
          message: 'country frequency fetched successfully',
          response: mapSorted,
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query subscription collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async sortProductsBasedOnSubscription(req, res) {
    const { query } = req.query;

    if (!query) {
      return Response.failure(res, { message: 'query required' }, httpCode.BAD_REQUEST);
    }

    if (query !== 'bound' && query !== 'top3') {
      return Response.failure(res, { message: 'query can either be bound or top3' }, httpCode.BAD_REQUEST);
    }
    let products = [];
    const map = {};
    try {
      const result = await this.getAllSubscriptions();
      if (result.length > 0) {
        result.forEach((element) => {
          products = products.concat(element.productId);
        });
        logger.info(products);
        products.forEach((product) => {
          if (!map[product]) {
            map[product] = 1;
          } else {
            // eslint-disable-next-line no-plusplus
            map[product]++;
          }
        });

        const sortable = [];
        // eslint-disable-next-line array-callback-return
        Object.keys(map).map(((pro) => {
          sortable.push([pro, map[pro]]);
        }));

        sortable.sort((a, b) => b[1] - a[1]);

        const most = {
          productId: sortable[0][0],
          frequency: sortable[0][1],
        };
        const least = {
          productId: sortable[sortable.length - 1][0],
          frequency: sortable[sortable.length - 1][1],
        };

        const top3 = sortable;
        top3.length = 3;
        logger.info(top3);
        const top3Array = [];

        top3.forEach((element) => {
          top3Array.push({
            productId: element[0],
            frequency: element[1],
          });
        });

        return Response.success(res, {
          message: query === 'top3' ? 'top 3 products fetched successfully' : 'most & least product fetched successfully',
          response: query === 'top3' ? top3Array : { most, least },
        }, httpCode.OK);
      }
      return Response.success(res, {
        message: 'no record available',
        response: [],
      }, httpCode.OK);
    } catch (error) {
      logger.info(error);
      return Response.failure(res, { message: 'unable to query subscription collection', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  // Duration controllers!!!!!!
  async addNewDuration(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    await DurationSchema.createDuration.validateAsync(req.body);
    try {
      const duration = await this.addDuration(req.body);
      return Response.success(res, { message: 'duration saved successfully', response: duration }, httpCode.CREATED);
    } catch (error) {
      return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getDurationById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    let { durationId } = req.params;
    try {
      if (!durationId) {
        durationId = config.currentDurationId;
      }
      const duration = await this.getDuration({ durationId });
      if (duration) {
        Response.success(res, { message: 'duration fetched successfully', response: duration }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'durationId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllDuration(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    try {
      const duration = await this.getDurations(req.body);
      return Response.success(res, { message: 'duration fetched successfully', response: duration }, httpCode.OK);
    } catch (error) {
      return Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async updateDurationById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }

    try {
      const duration = await this.updateDuration({ durationId: config.currentDurationId }, req.body);
      if (duration) {
        Response.success(res, { message: 'duration updated well!!', response: duration }, httpCode.OK);
        return;
      }
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'durationId passed does not exists' }, httpCode.NOT_FOUND);
        return;
      }
      Response.failure(res, { message: 'an error occured', response: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteDurationById(req, res) {
    if (req.role !== Constant.ADMIN && req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    let { id } = req.params;
    try {
      if (!id) {
        id = config.currentDurationId;
      }
      const record = await this.deleteDuration({ durationId: id });
      if (record) {
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
}

module.exports = new Subscription();
