const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

const auth = require('../../middlewares/auth');

const TransactionController = require('../../controllers/transaction');


route.post('/create', auth, asyncHandler((req, res) => TransactionController.createTransaction(req, res)));

route.get('/all', auth, asyncHandler((req, res) => TransactionController.getTransactions(req, res)));

route.get('/one/:transactionId', auth, asyncHandler((req, res) => TransactionController.getTransactionById(req, res)));

route.get('/report/download', auth, asyncHandler((req, res) => TransactionController.downloadTransactionReport(req, res)));

route.put('/:transactionId', auth, asyncHandler((req, res) => TransactionController.updateTransactionById(req, res)));

route.delete('/:id', auth, asyncHandler((req, res) => TransactionController.deleteTransactionById(req, res)));

module.exports = route;
