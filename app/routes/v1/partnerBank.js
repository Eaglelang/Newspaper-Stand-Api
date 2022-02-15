const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const PartnerBankController = require('../../controllers/partnerBank');

route.post('/add', auth, asyncHandler((req, res) => PartnerBankController.addPartnerBank(req, res)));

route.get('/:partnerId', auth, asyncHandler((req, res) => PartnerBankController.getPartnerBankById(req, res)));

route.get('/all', auth, asyncHandler((req, res) => PartnerBankController.getPartnerBanks(req, res)));

route.put('/:partnerId', auth, asyncHandler((req, res) => PartnerBankController.updatePartnerBankById(req, res)));

route.delete('/:partnerId', auth, asyncHandler((req, res) => PartnerBankController.deletePartnerBankById(req, res)));

module.exports = route;
