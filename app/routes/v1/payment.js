const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');
const auth = require('../../middlewares/auth');


const PaymentController = require('../../controllers/payments/paypal');
const UnifiedController = require('../../controllers/payments/unified');
const WalletController = require('../../controllers/payments/unified');


route.post('/paypal/make', asyncHandler((req, res) => PaymentController.makePayment(req, res)));

route.post('/unified/response', asyncHandler((req, res) => UnifiedController.responsePostbackFromUP(req, res)));

// wallet!!!!!!!!
route.post('/wallet/fund', auth, asyncHandler((req, res) => UnifiedController.makePaymentWithUP(req, res)));

route.post('/super/wallet/fund', auth, asyncHandler((req, res) => UnifiedController.tnsFundCUstomerWallet(req, res)));

// get customer wallet
route.get('/wallet/:userId', auth, asyncHandler((req, res) => WalletController.getCustomerParentWalletByParentId(req, res)));

route.get('/wallet/partner/:partnerId', auth, asyncHandler((req, res) => WalletController.getPartnerWalletById(req, res)));

route.get('/wallet/system/tns', asyncHandler((req, res) => WalletController.getTNSWalletBalance(req, res)));

route.get('/wallet/system/blusalt', asyncHandler((req, res) => WalletController.getBlusaltWalletBalance(req, res)));

module.exports = route;
