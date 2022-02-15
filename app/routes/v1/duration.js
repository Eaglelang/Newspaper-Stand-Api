const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const SubscriptionController = require('../../controllers/subscription');

route.post('/add', auth, asyncHandler((req, res) => SubscriptionController.addNewDuration(req, res)));

route.get('/:durationId', auth, asyncHandler((req, res) => SubscriptionController.getDurationById(req, res)));

route.get('/all', auth, asyncHandler((req, res) => SubscriptionController.getAllDuration(req, res)));

route.put('/', auth, asyncHandler((req, res) => SubscriptionController.updateDurationById(req, res)));

route.delete('/:durationId', auth, asyncHandler((req, res) => SubscriptionController.deleteDurationById(req, res)));

module.exports = route;
