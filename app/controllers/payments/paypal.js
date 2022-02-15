/* eslint-disable no-plusplus */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */

const paypal = require('paypal-rest-sdk');
const Response = require('../../commons/response');
const httpCode = require('../../commons/httpCode');
const logger = require('../../lib/logger');


paypal.configure({
  mode: 'sandbox', // sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET_ID,
});


class Paypal {
  async makePayment(req, res) {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return Response.failure(res, { message: 'subscription cost is required' }, httpCode.BAD_REQUEST);
    }
    const payment = {
      intent: 'authorize',
      payer: {
        payment_method: 'paypal',
      },
      redirect_urls: {
        return_url: 'http://127.0.0.1:8080/v1/payment/paypal/success',
        cancel_url: 'http://127.0.0.1:8080/v1/payment/paypal/err',
      },
      transactions: [{
        amount: {
          total: amount,
          currency: 'USD',
        },
        description: 'bundle subscription payment call',
      }],
    };
    this.createPay(payment)
      .then((transaction) => {
        // capture HATEOAS links
        const { links } = transaction;
        let counter = links.length;
        while (counter--) {
          if (links[counter].method === 'REDIRECT') {
            return res.redirect(links[counter].href);
          }
        }
      })
      .catch((err) => {
        logger.info(err);
        return Response.failure(res, { message: 'error occured' }, httpCode.INTERNAL_SERVER_ERROR);
      });
  }

  createPay(payment) {
    return new Promise((resolve, reject) => {
      paypal.payment.create(payment, (err, response) => {
        if (err) {
          logger.info(err);
          reject(err);
        } else {
          logger.info(response);
          resolve(response);
        }
      });
    });
  }

  async successPostBack(req, res) {
    const { paymentId } = req.query;
    const payerId = { payer_id: req.query.PayerID };

    paypal.payment.execute(paymentId, payerId, (error, payment) => {
      logger.info(payment);
      if (error) {
        logger.info(error);
      } else if (payment.state === 'approved') {
        res.send('payment completed successfully');
      } else {
        res.send('payment not successful');
      }
    });
  }

  async cancelPostBack(req, res) {
    logger.info(req);
    res.send(req);
  }
}
module.exports = new Paypal();
