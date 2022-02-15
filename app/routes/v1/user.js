const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const UserController = require('../../controllers/users/user');

const auth = require('../../middlewares/auth');


route.post('/signin', asyncHandler((req, res) => UserController.adminSignIn(req, res)));

route.post('/signup', asyncHandler((req, res) => UserController.createAdmin(req, res)));

route.get('/allUser', auth, asyncHandler((req, res) => UserController.getUsers(req, res)));

route.get('/:userId', auth, asyncHandler((req, res) => UserController.getUserById(req, res)));

route.put('/:userId', auth, asyncHandler((req, res) => UserController.updateUserById(req, res)));

route.put('account/:userId', auth, asyncHandler((req, res) => UserController.deactivateAdminAccount(req, res)));

route.put('/one/change-password', auth, asyncHandler((req, res) => UserController.changePassword(req, res)));

route.post('/forgot-password', asyncHandler((req, res) => UserController.forgotPassword(req, res)));

route.put('/reset-password/:token', asyncHandler((req, res) => UserController.resetPassword(req, res)));

route.post('/change-picture', auth, asyncHandler((req, res) => UserController.changeProfilePicture(req, res)));


module.exports = route;
