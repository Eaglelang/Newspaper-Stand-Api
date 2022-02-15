
const winston = require('winston');

const consoleTransport = new (winston.transports.Console)({
  datePattern: 'yyyy-MM-dd.',
  prepend: true,
  json: true,
  colorize: true,
  level: process.env.ENV === 'development' ? 'debug' : 'info',
});
const alignColorsAndTime = winston.format.combine(
  winston.format.colorize({
    all: true,
  }),
  winston.format.label({
    label: '****',
  }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:MM:SS',
  }),
  winston.format.printf(
    (info) => ` ${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`,
  ),
);
const transports = [consoleTransport, new (winston.transports.Console)({
  format: winston.format.combine(winston.format.colorize(), alignColorsAndTime),
})];
module.exports = winston.createLogger({
  transports,
});
