const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const BundleController = require('../../controllers/bundle');


route.post('/create', auth, asyncHandler((req, res) => BundleController.createBundle(req, res)));

route.get('/all', auth, asyncHandler((req, res) => BundleController.getBundles(req, res)));

route.get('/one/:bundleId', auth, asyncHandler((req, res) => BundleController.getBundleById(req, res)));

route.put('/:bundleId', auth, asyncHandler((req, res) => BundleController.updateBundleById(req, res)));

route.delete('/:id', auth, asyncHandler((req, res) => BundleController.deleteBundleById(req, res)));

module.exports = route;
