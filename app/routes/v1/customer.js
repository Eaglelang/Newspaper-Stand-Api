const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const CustomerCoopParentController = require('../../controllers/users/customer/cooperate/parent');
const CustomerIndParentController = require('../../controllers/users/customer/individual/parent');
const CustomerCoopChildController = require('../../controllers/users/customer/cooperate/child');
const CustomerIndChildController = require('../../controllers/users/customer/individual/child');

// general for both cooperate and individual
route.get('/parent/freemium', auth, asyncHandler((req, res) => CustomerCoopParentController.activate7DaysFreemium(req, res)));


// cooperate parent
// signin and refreshToken for all type of customers
route.post('/signin', asyncHandler((req, res) => CustomerCoopParentController.signinCustomerCoopParent(req, res)));

route.post('/refresh-token', asyncHandler((req, res) => CustomerCoopParentController.refreshAccessToken(req, res)));

route.post('/cooperate/parent/create', asyncHandler((req, res) => CustomerCoopParentController.createCooperateParent(req, res)));

route.get('/cooperate/parent/all', auth, asyncHandler((req, res) => CustomerCoopParentController.getCooperateParentCustomer(req, res)));

route.get('/cooperate/parent/one/:id', auth, asyncHandler((req, res) => CustomerCoopParentController.getCustomerCoopParentById(req, res)));

route.put('/cooperate/parent/record/:id', auth, asyncHandler((req, res) => CustomerCoopParentController.updateCooperateParentById(req, res)));

route.put('/cooperate/parent/change-password', auth, asyncHandler((req, res) => CustomerCoopParentController.changePassword(req, res)));

route.post('/cooperate/parent/forgot-password', asyncHandler((req, res) => CustomerCoopParentController.forgotPassword(req, res)));

route.put('/cooperate/parent/reset-password/:token', asyncHandler((req, res) => CustomerCoopParentController.resetPassword(req, res)));

route.post('/cooperate/parent/change-picture', auth, asyncHandler((req, res) => CustomerCoopParentController.changeProfilePicture(req, res)));

route.get('/cooperate/parent/search', asyncHandler((req, res) => CustomerCoopParentController.searchCooperateParent(req, res)));

// opt endpoints for cooperate
route.get('/cooperate/otp/send/:phoneNumber', asyncHandler((req, res) => CustomerCoopParentController.sendOtpToCustomer(req, res)));

route.post('/cooperate/otp/verify/', asyncHandler((req, res) => CustomerCoopParentController.verifyOTPCode(req, res)));

// cooperate child

route.post('/cooperate/child/bulk/create', auth, asyncHandler((req, res) => CustomerCoopChildController.createCooperateChildInBulk(req, res)));

route.post('/cooperate/child/create', auth, asyncHandler((req, res) => CustomerCoopChildController.createCooperateChild(req, res)));

route.get('/cooperate/child/all', auth, asyncHandler((req, res) => CustomerCoopChildController.getCooperateChildrenCustomer(req, res)));

route.get('/cooperate/child/:id', auth, asyncHandler((req, res) => CustomerCoopChildController.getCustomerCoopChildById(req, res)));

route.put('/cooperate/child/:id', auth, asyncHandler((req, res) => CustomerCoopChildController.updateCooperateChildById(req, res)));

route.put('/cooperate/child/change-password', auth, asyncHandler((req, res) => CustomerCoopChildController.changePassword(req, res)));

route.put('/child/status/', auth, asyncHandler((req, res) => CustomerCoopChildController.setChildAccountStatus(req, res)));

route.post('/cooperate/child/forgot-password', asyncHandler((req, res) => CustomerCoopChildController.forgotPassword(req, res)));

route.put('/cooperate/child/reset-password/:token', asyncHandler((req, res) => CustomerCoopChildController.resetPassword(req, res)));

route.post('/cooperate/child/change-picture', auth, asyncHandler((req, res) => CustomerCoopChildController.changeProfilePicture(req, res)));

// individual parent

route.post('/individual/parent/create', asyncHandler((req, res) => CustomerIndParentController.createIndividualParent(req, res)));

route.get('/individual/parent/all', auth, asyncHandler((req, res) => CustomerIndParentController.getIndividualParentCustomer(req, res)));

route.get('/individual/parent/one/:id', auth, asyncHandler((req, res) => CustomerIndParentController.getCustomerIndParentById(req, res)));

route.put('/individual/parent/:id', auth, asyncHandler((req, res) => CustomerIndParentController.updateIndividualParentById(req, res)));

route.put('/individual/parent/change-password', auth, asyncHandler((req, res) => CustomerIndParentController.changePassword(req, res)));

route.post('/individual/parent/forgot-password', asyncHandler((req, res) => CustomerIndParentController.forgotPassword(req, res)));

route.put('/individual/parent/reset-password/:token', asyncHandler((req, res) => CustomerIndParentController.resetPassword(req, res)));

route.post('/individual/parent/change-picture', auth, asyncHandler((req, res) => CustomerIndParentController.changeProfilePicture(req, res)));

route.get('/individual/parent/search', asyncHandler((req, res) => CustomerIndParentController.searchIndividualParent(req, res)));

// opt endpoints for individual
route.get('/individual/otp/send/:phoneNumber', asyncHandler((req, res) => CustomerIndParentController.sendOtpToCustomer(req, res)));

route.post('/individual/otp/verify/', asyncHandler((req, res) => CustomerIndParentController.verifyOTPCode(req, res)));


// individual child

route.post('/individual/child/create', auth, asyncHandler((req, res) => CustomerIndChildController.createIndividualChild(req, res)));

route.get('/individual/child/all', auth, asyncHandler((req, res) => CustomerIndChildController.getIndividualChildrenCustomer(req, res)));

route.get('/individual/child/:id', auth, asyncHandler((req, res) => CustomerIndChildController.getCustomerIndChildById(req, res)));

route.put('/individual/child/:id', auth, asyncHandler((req, res) => CustomerIndChildController.updateIndividualChildById(req, res)));

route.put('/individual/child/change-password', auth, asyncHandler((req, res) => CustomerIndChildController.changePassword(req, res)));

route.post('/individual/child/forgot-password', asyncHandler((req, res) => CustomerIndChildController.forgotPassword(req, res)));

route.put('/individual/child/reset-password/:token', asyncHandler((req, res) => CustomerIndChildController.resetPassword(req, res)));

route.post('/individual/child/change-picture', auth, asyncHandler((req, res) => CustomerIndChildController.changeProfilePicture(req, res)));

module.exports = route;
