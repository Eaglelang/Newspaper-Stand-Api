
require('dotenv').config();

const express = require('express');

const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const errorHandler = require('./lib/requestErrorHandler');

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// mongo connection
require('./lib/mongo');
// routes configuration
require('./routes')(app);

const dir = './uploads';

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

app.get('/', async (req, res) => {
  res.status(200).send('welcome to newspaper stand');
});

app.get('/ping', async (req, res) => {
  res.status(200).send('Application is running');
});

// error handling must be the last middleware
app.use(errorHandler);

module.exports = app;
