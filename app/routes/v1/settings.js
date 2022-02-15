const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const SettingsController = require('../../controllers/settings');

route.get('/all', auth, asyncHandler((req, res) => SettingsController.getSettings(req, res)));

route.put('/set-minimum-amount', auth, asyncHandler((req, res) => SettingsController.setMinimumAmountToFundWith(req, res)));


module.exports = route;
