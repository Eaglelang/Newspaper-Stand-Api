/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const shortid = require('shortid');
const validUrl = require('valid-url');
const audit = require('../../audits/auditHelper');
const Response = require('../../commons/response');
const httpCode = require('../../commons/httpCode');
const WalletService = require('../../services/users/wallet');
const CustomerService = require('../../services/users/customer');
const TransactionService = require('../../services/transaction');
const Setting = require('../settings');
const logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const config = require('../../lib/config');
const Constant = require('../../commons/constants');
const emailTemp = require('../../commons/email');
const { addRevenueOrFundingMoneyToTNSWallet } = require('../helper');

let id = '';
let role = '';
let redirectUrl = '';
class Unified extends WalletService {
  async fundUserWallet(req, res) {
    logger.info(req.body);
    const { amountPaid, transactionId, unifiedResponse } = req.body;
    try {
      const param = {};
      param.query = { _id: id };
      let customer;
      if (role === Constant.CUSTOMER_COOP_PARENT) customer = await new CustomerService().getCustomerCoopParent(param);
      if (role === Constant.CUSTOMER_IND_PARENT) customer = await new CustomerService().getCustomerIndParent(param);
      const currentWallet = await this.getCustomerWallet({ userId: id });
      const aggregatedAmount = currentWallet.amount + Number(amountPaid);
      const updatedWallet = await this.updateWallet({ userId: id }, { amount: aggregatedAmount });
      // return Response.failure(res, { message: 'wallet not credited' }, httpCode.INTERNAL_SERVER_ERROR);
      if (!updatedWallet) return res.redirect(`${redirectUrl}?status=fail`);
      // add money to TNS funding wallet
      const tnsRev = await addRevenueOrFundingMoneyToTNSWallet(Number(amountPaid), config.TNS.walletId, Constant.NAIRA, true);
      logger.info(tnsRev);
      const transaction = {
        status: 'success',
        amount: Number(amountPaid),
        transactionId,
        transactionTitle: 'wallet funding',
        detail: 'Wallet funded successully',
        side: 'credit',
        userId: id,
        unifiedResponse,
      };
      const savedResponse = await new TransactionService().addTransaction(transaction);
      logger.info(savedResponse);
      const content = {};
      content.body = `<strong>Hello ${customer.firstname}<strong/>,<br />
          Your wallet has been successfully funded with the sum of N${amountPaid}.
          <br /><br />
          Kindly proceed to subscribe and enjoy digital replicas of your favourite Newspapers and Magazines.
          <br /><br />
          Happy Reading,<br />
          TheNewspaperStand Team`;
      content.subject = 'Payment when funding';
      const mailPayload = {
        email: customer.email,
        subject: content.subject,
        title: 'Payment Received',
        html: emailTemp(content),
      };
      await Util.sendMailNotification(mailPayload)
        .then((resp) => {
          logger.info('successfully sent mail', resp);
          audit.trail('Customer funded wallet', 'wallet funding', id, updatedWallet);
          return res.redirect(`${redirectUrl}?status=success`);
          // return Response.success(res, { message: 'wallet funded successfully', response: { balance: updatedWallet.amount } }, httpCode.OK);
        }).catch((mailError) => {
          logger.info(mailError);
          audit.trail('Customer funded wallet', 'wallet funding', id, updatedWallet);
          logger.info('wallet funded successfully');
          return res.redirect(`${redirectUrl}?status=success`);
          // return Response.success(res, { message: 'wallet funded successfully', response: { balance: updatedWallet.amount } }, httpCode.OK);
        });
    } catch (error) {
      console.log(error);
      const transaction = {
        status: 'pending',
        amount: Number(amountPaid),
        transactionId,
        transactionTitle: 'wallet funding',
        detail: 'something went wrong, kindly request for your money refund from TNS and try funding again',
        userId: id,
        unifiedResponse,
      };
      const savedResponse = await new TransactionService().addTransaction(transaction);
      logger.info(savedResponse);
      return res.redirect(`${redirectUrl}?status=fail`);
      // Response.failure(res, { message: 'unable to fund wallet', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async tnsFundCUstomerWallet(req, res) {
    if (req.role !== Constant.SUPER_ADMIN) {
      logger.info('forbidden! you cant access this resource');
      return Response.failure(res, { message: 'forbidden! you cant access this resource' }, httpCode.FORBIDDEN);
    }
    const { amount, userId } = req.body;
    if (!amount || !userId) {
      return Response.failure(res, { message: 'amount and userId required' }, httpCode.BAD_REQUEST);
    }
    if (typeof amount !== 'number') {
      return Response.failure(res, { message: 'amount can only take number' }, httpCode.UNPROCESSED_ENTITY);
    }
    try {
      const currentWallet = await this.getCustomerWallet({ userId });
      logger.info('TNS funding customer wallet:', req.id);
      if (currentWallet) {
        const aggregatedAmount = currentWallet.amount + Number(amount);
        const updatedWallet = await this.updateWallet({ userId }, { amount: aggregatedAmount });
        if (updatedWallet) {
          const transaction = {
            status: 'success',
            amount,
            side: 'credit',
            transactionId: shortid.generate(),
            transactionTitle: 'tns fund wallet',
            detail: 'TNS funded customer wallet',
            userId,
          };
          const savedResponse = await new TransactionService().addTransaction(transaction);
          logger.info(savedResponse);
          return Response.success(res, {
            message: 'wallet funded successully',
            response: updatedWallet,
          }, httpCode.OK);
        }
      }
    } catch (error) {
      return Response.failure(res, { message: 'unable to get wallet', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getCustomerParentWalletByParentId(req, res) {
    const { userId } = req.params;

    if (userId === undefined) {
      return Response.failure(res, { message: 'id required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { userId };
      param.fields = { userId: 0, createdAt: 0, updatedAt: 0 };
      const wallet = await this.getCustomerWallet(param);
      if (wallet) {
        return Response.success(res, {
          message: 'customer wallet successully fetched',
          response: wallet,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'wallet not found' }, httpCode.OK);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to get wallet', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getPartnerWalletById(req, res) {
    const { partnerId } = req.params;

    if (partnerId === undefined) {
      return Response.failure(res, { message: 'id required in param' }, httpCode.BAD_REQUEST);
    }
    try {
      const param = {};
      param.query = { userId: partnerId };
      param.fields = { userId: 0, createdAt: 0, updatedAt: 0 };
      const wallet = await this.getPartnerWallet(param);
      if (wallet) {
        return Response.success(res, {
          message: 'partner wallet successully fetched',
          response: wallet,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'wallet not found' }, httpCode.NOT_FOUND);
    } catch (error) {
      if (error.msg.name === 'CastError') {
        Response.failure(res, { message: 'id passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to get wallet', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getTNSWalletBalance(req, res) {
    try {
      const userId = Constant.TNS_WALLET_ID;
      const param = {};
      param.query = { userId };
      param.fields = { userId: 0, createdAt: 0, updatedAt: 0 };
      const wallet = await this.getTNSWallet(param);
      if (wallet) {
        return Response.success(res, {
          message: 'TNS wallet successully fetched',
          response: wallet,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'wallet not found' }, httpCode.OK);
    } catch (error) {
      if (error.msg === 'CastError') {
        Response.failure(res, { message: 'userId passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to get wallet', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getBlusaltWalletBalance(req, res) {
    try {
      const userId = Constant.BLUSALT_WALLET_ID;
      const param = {};
      param.query = { userId };
      param.fields = { userId: 0, createdAt: 0, updatedAt: 0 };
      const wallet = await this.getCustomerWallet(param);
      if (wallet) {
        return Response.success(res, {
          message: 'Blusalt wallet successully fetched',
          response: wallet,
        }, httpCode.OK);
      }
      return Response.failure(res, { message: 'wallet not found' }, httpCode.OK);
    } catch (error) {
      if (error.msg === 'CastError') {
        Response.failure(res, { message: 'userId passed seems not correct' }, httpCode.NOT_FOUND);
        return;
      }
      return Response.failure(res, { message: 'unable to get wallet', data: error }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  // call UP api to create order with a certain payload
  // a response is sent from UP that contains transaction ID
  // That ID is used to when calling make payment api of UP
  // redirect the customer to UP MPI to make payment with that ID
  // UP MPI responds to the return url passed with some response obj
  // We make a status check request with the transaction ID again on UP status endpoint
  // a final response will be sent, which will be stored for tracking
  async makePaymentWithUP(req, res) {
    const { amount, returnUrl } = req.body;
    if (!amount || !returnUrl) {
      return Response.failure(res, {
        message: 'amount and returnUrl are required',
      }, httpCode.UNPROCESSED_ENTITY);
    }
    if (!validUrl.isUri(returnUrl)) {
      return Response.failure(res, {
        message: 'returnUrl is not valid',
      }, httpCode.UNPROCESSED_ENTITY);
    }
    id = req.id;
    role = req.role;
    redirectUrl = returnUrl;
    try {
      const minimumAmount = await Setting.getMinAmount() || 100;
      if (req.body.amount < minimumAmount) {
        return Response.failure(res, {
          message: 'amount too low', response: `minimum amount you can fund with is ${minimumAmount}`,
        }, httpCode.UNPROCESSED_ENTITY);
      }
      const wallet = await new WalletService().getCustomerWallet({ userId: req.id });
      if (!wallet) {
        return Response.failure(res, { message: 'Wallet not found kindly contact admin or try again!' }, httpCode.NOT_FOUND);
      }
      const transaction = {
        status: 'fail',
        amount,
        transactionId: shortid.generate(),
        transactionTitle: 'wallet funding',
        detail: 'UP unable to create order and generate trxId',
        userId: req.id,
      };
      let response = await Util.upInitiateTransactionHandler({ amount });
      response = JSON.parse(response);
      logger.info(response);
      if (!response) {
      // save transaction detail here
        logger.info('UP unable to create order and generate trxId! Try again');
        await new TransactionService().addTransaction(transaction);
        return Response.failure(res, { message: 'something went wrong' }, httpCode.INTERNAL_SERVER_ERROR);
      }
      transaction.status = 'initiating';
      transaction.transactionId = response;
      transaction.detail = 'Transaction saved with the UP transactionId';
      const savedResponse = await new TransactionService().addTransaction(transaction);
      logger.info(savedResponse);
      return Response.success(res, { message: 'url sent successfully', response: `https://test.payarena.com/${response}` }, httpCode.OK);
    } catch (error) {
      console.log(error);
      return Response.failure(res, { message: 'an error occured', response: error.msg }, httpCode.INTERNAL_SERVER_ERROR);
    }
  }

  async responsePostbackFromUP(req, res) {
    const response = req.body;
    if (!response.trxId) {
      const transaction = {
        status: 'fail',
        transactionId: shortid.generate(),
        transactionTitle: 'wallet funding',
        detail: 'UP unable to return with success and trxId',
        userId: id,
      };
      const savedResponse = await new TransactionService().addTransaction(transaction);
      logger.info(savedResponse);
      return res.redirect(`${redirectUrl}?status=fail`);
    }
    const data = await Util.checkUPTransactionStatus(response.trxId);
    logger.info(data);
    req.body.amountPaid = data.Amount;
    req.body.transactionId = response.trxId;
    req.body.unifiedResponse = data;
    await this.fundUserWallet(req, res);
  }
}

module.exports = new Unified();
