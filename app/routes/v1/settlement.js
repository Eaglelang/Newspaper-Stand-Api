const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const SettlementController = require('../../controllers/settlement');
const PayoutController = require('../../controllers/payout');

route.post('/add', auth, asyncHandler((req, res) => SettlementController.addSettlement(req, res)));

route.get('/one/:setttlementId', auth, asyncHandler((req, res) => SettlementController.getSettlementById(req, res)));

route.get('/all', auth, asyncHandler((req, res) => SettlementController.getSettlements(req, res)));

route.get('/aggregation', asyncHandler((req, res) => SettlementController.getAggregatedSettlementAmount(req, res)));

route.put('/:setttlementId', auth, asyncHandler((req, res) => SettlementController.updateSettlementById(req, res)));

route.delete('/:setttlementId', auth, asyncHandler((req, res) => SettlementController.deleteSettlementById(req, res)));

// payout
route.get('/payout/initiate', asyncHandler((req, res) => PayoutController.initiatePayout(req, res)));

route.get('/payout/schedule', asyncHandler((req, res) => PayoutController.initiateSendSchedledEmail(req, res)));

module.exports = route;
