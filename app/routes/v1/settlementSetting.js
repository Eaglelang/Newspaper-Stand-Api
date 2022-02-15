const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const SettlementSettingController = require('../../controllers/settlementSetting');

route.post('/add', auth, asyncHandler((req, res) => SettlementSettingController.addSettlementSetting(req, res)));

route.get('/one/:setttlementSettingId', auth, asyncHandler((req, res) => SettlementSettingController.getSettlementSettingById(req, res)));

route.get('/all', auth, asyncHandler((req, res) => SettlementSettingController.getSettlementSettings(req, res)));

route.put('/:partnerId', auth, asyncHandler((req, res) => SettlementSettingController.updateSettlementSettingById(req, res)));

route.delete('/:partnerId', auth, asyncHandler((req, res) => SettlementSettingController.deleteSettlementSettingById(req, res)));

module.exports = route;
