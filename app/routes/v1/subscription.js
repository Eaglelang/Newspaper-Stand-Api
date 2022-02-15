const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const SubscriptionController = require('../../controllers/subscription');

route.post('/local', auth, asyncHandler((req, res) => SubscriptionController.productSubscription(req, res)));

route.post('/international', auth, asyncHandler((req, res) => SubscriptionController.bundleSubscription(req, res)));

route.get('/all', auth, asyncHandler((req, res) => SubscriptionController.getAllSubscription(req, res)));

route.get('/total/device', asyncHandler((req, res) => SubscriptionController.getTotalRevenueByDevice(req, res)));

route.get('/total/revenue', asyncHandler((req, res) => SubscriptionController.getTotalRevenueGraph(req, res)));

route.get('/country', asyncHandler((req, res) => SubscriptionController.subscriberByCountry(req, res)));

route.get('/products', asyncHandler((req, res) => SubscriptionController.sortProductsBasedOnSubscription(req, res)));

route.post('/amount', asyncHandler((req, res) => SubscriptionController.getMoneyForSelectedProduct(req, res)));

module.exports = route;
