const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const CouponController = require('../../controllers/coupon');


route.post('/create', auth, asyncHandler((req, res) => CouponController.createCoupon(req, res)));

route.get('/all', auth, asyncHandler((req, res) => CouponController.getCoupons(req, res)));

route.get('/one/:couponCode', auth, asyncHandler((req, res) => CouponController.getCouponBycouponCode(req, res)));

route.put('/:couponCode', auth, asyncHandler((req, res) => CouponController.updateCouponByCouponCode(req, res)));

route.delete('/:couponCode', auth, asyncHandler((req, res) => CouponController.deleteCouponByCouponCode(req, res)));

route.get('/status/:couponCode', auth, asyncHandler((req, res) => CouponController.checkCouponActiveness(req, res)));

module.exports = route;
