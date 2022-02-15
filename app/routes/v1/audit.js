const express = require('express');

const route = express.Router();

// used to enable catching and handling errors globally
const asyncHandler = require('express-async-handler');

// const auth = require('../../middlewares/auth');

const AuditController = require('../../audits/auditController');

route.get('/all', asyncHandler((req, res) => AuditController.getAudits(req, res)));

route.delete('/index', asyncHandler((req, res) => AuditController.deleteIndex(req, res)));

module.exports = route;
