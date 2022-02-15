const express = require('express');

const route = express.Router();
const asyncHandler = require('express-async-handler');
const auth = require('../../middlewares/auth');

// used to enable catching and handling errors globally

// const auth = require('../../middlewares/auth');

const PartnerAnalyticsController = require('../../analytics/partner');

route.get('/partner', auth, asyncHandler((req, res) => PartnerAnalyticsController.totalRevenueForPartner(req, res)));

module.exports = route;
