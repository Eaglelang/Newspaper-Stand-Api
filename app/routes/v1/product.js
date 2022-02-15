const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const ProductController = require('../../controllers/product');


route.post('/create', auth, asyncHandler((req, res) => ProductController.createProduct(req, res)));

route.get('/all', auth, asyncHandler((req, res) => ProductController.getProducts(req, res)));

route.get('/one/:productId', auth, asyncHandler((req, res) => ProductController.getProductById(req, res)));

route.put('/price/:productId', auth, asyncHandler((req, res) => ProductController.setProductPrice(req, res)));

route.put('/one/:productId', auth, asyncHandler((req, res) => ProductController.updateProductById(req, res)));

route.delete('/:id', auth, asyncHandler((req, res) => ProductController.deleteProductById(req, res)));

// enable or disable product or bundle
route.put('/subscription', auth, asyncHandler((req, res) => ProductController.enableOrDisableSubscription(req, res)));

module.exports = route;
