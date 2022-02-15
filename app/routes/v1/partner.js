const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const PartnerController = require('../../controllers/users/partner');


route.post('/signin', asyncHandler((req, res) => PartnerController.partnerSignIn(req, res)));

route.post('/create', auth, asyncHandler((req, res) => PartnerController.createPartner(req, res)));

route.get('/all', auth, asyncHandler((req, res) => PartnerController.getPartners(req, res)));

route.get('/:partnerId', auth, asyncHandler((req, res) => PartnerController.getPartnerById(req, res)));

route.put('/set-status/', auth, asyncHandler((req, res) => PartnerController.setPartnerAccountStatus(req, res)));

route.put('/account/:partnerId', auth, asyncHandler((req, res) => PartnerController.updatePartnerById(req, res)));

route.post('/forgot-password', asyncHandler((req, res) => PartnerController.forgotPassword(req, res)));

route.put('/reset-password/:token', asyncHandler((req, res) => PartnerController.resetPassword(req, res)));

route.put('/change-picture', auth, asyncHandler((req, res) => PartnerController.changeProfilePicture(req, res)));

route.put('/change-password', auth, asyncHandler((req, res) => PartnerController.changePassword(req, res)));

route.delete('/:id', auth, asyncHandler((req, res) => PartnerController.deletePartnerById(req, res)));

module.exports = route;
