/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable no-async-promise-executor */
/* eslint-disable consistent-return */
/* eslint-disable max-len */
const jwt = require('jsonwebtoken');
const shortid = require('shortid');
const multer = require('multer');
const logger = require('../lib/logger');
const util = require('../lib/utils');
const Constant = require('../commons/constants');
const WalletService = require('../services/users/wallet');
const ProductService = require('../services/product');
const PartnerService = require('../services/users/partner');
const PartnerBankService = require('../services/partnerBank');
const TransactionService = require('../services/transaction');

const maxSize = 1 * 1000 * 1000;
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, './uploads');
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  return cb(null, true);
};

const childBulkFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(csv)$/)) {
    req.fileValidationError = 'Only csv file is allowed!';
    return cb(new Error('Only csv file is allowed!'), false);
  }
  return cb(null, true);
};

module.exports.verifyRefreshToken = (refreshToken) => new Promise((resolve, reject) => {
  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, payload) => {
    if (err) return reject(new Error('autentication failed! invalid refreshToken'));
    return resolve(payload);
  });
});

module.exports.formatPhone = (phoneNumber) => {
  phoneNumber = phoneNumber.toString().replace(/\D/g, '');
  if (phoneNumber.startsWith('234')) return phoneNumber;
  phoneNumber = Number(phoneNumber.substr((phoneNumber.length - 10), phoneNumber.length));
  return phoneNumber ? `234${phoneNumber}` : undefined;
};

module.exports.deductMoneyFromWallet = (amount, userId) => new Promise(async (resolve, reject) => {
  try {
    const wallet = await new WalletService().getCustomerWallet({ userId });
    logger.info(wallet);
    let deduct = wallet.amount - amount;
    deduct = await util.roundUp(deduct);
    logger.info(deduct);
    const updatedWallet = await new WalletService().updateWallet({ userId }, { amount: deduct });
    logger.info(updatedWallet);
    if (updatedWallet.amount === deduct) {
      await successTransactionHandler(await util.roundUp(amount), 'publication(s) subscription',
        'customer made a subscription purchase', 'debit', userId);
      return resolve(true);
    }
    return resolve(false);
  } catch (error) {
    return reject(error);
  }
});

module.exports.addMoneyToWallet = async (amount, userId) => new Promise(async (resolve, reject) => {
  try {
    const wallet = await new WalletService().getCustomerWallet({ userId });
    logger.info(wallet);
    const add = wallet.amount + amount;
    logger.info(add);
    const updatedWallet = await new WalletService().updateWallet({ userId }, { amount: add });
    logger.info(updatedWallet);
    if (updatedWallet.amount === add) {
      return resolve(true);
    }
    return resolve(false);
  } catch (error) {
    return reject(error);
  }
});

module.exports.payoutAggregator = new Promise(async (resolve, reject) => {
  try {
    const params = {};
    params.conditions = { role: Constant.PARTNER_ADMIN, status: 'active' };
    const aggregation = [];
    const partners = await new PartnerService().getPartners(params);
    if (!partners) {
      return reject(new Error('unable to query partners'));
    }
    partners.forEach(async (partner, index, array) => {
      if (partner._id) {
        const param = {};
        const prm = {};
        param.query = { userId: partner._id };
        prm.query = { partnerId: partner._id };
        const wallet = await new WalletService().getPartnerWallet(param);
        const bank = await new PartnerBankService().getPartnerBank(prm);
        const data = {
          companyName: partner.companyName,
          companyAddress: partner.companyAddress,
          companyEmail: partner.companyEmail,
          companyPhoneNumber: partner.companyPhoneNumber,
          profilePic: partner.profilePic || '',
          partnerId: partner._id,
          cacNumber: partner.cacNumber,
          country: partner.country,
          nairaBalance: wallet ? wallet.nairaBalance : '',
          dollarBalance: wallet ? wallet.dollarBalance : '',
          euroBalance: wallet ? wallet.euroBalance : '',
          poundsBalance: wallet ? wallet.poundsBalance : '',
          walletId: wallet ? wallet._id : '',
          bank: bank !== undefined && bank !== null ? bank.bank : '',
          accountName: bank !== undefined && bank !== null ? bank.accountName : '',
          accountNumber: bank !== undefined && bank !== null ? bank.accountNumber : '',
        };
        aggregation.push(data);
        if (index === array.length - 1) return resolve(aggregation);
      }
      return resolve(aggregation);
    });
  } catch (error) {
    return reject(error);
  }
});


module.exports.addRevenueOrFundingMoneyToTNSWallet = async (amount, userId, currency, funding) => new Promise(async (resolve, reject) => {
  try {
    const wallet = await new WalletService().getTNSWallet({ userId });
    if (currency === Constant.NAIRA) {
      if (funding) {
        const updatedWallet = await new WalletService().updateTNSWallet({ userId }, { fundingNairaBalance: amount });
        logger.info(updatedWallet);
        if (updatedWallet) {
          await successTransactionHandler(await util.roundUp(amount), 'updated fund wallet',
            'funded TNS NAIRA wallet when customer funded', 'credit', userId);
          return resolve(true);
        }
        return resolve(false);
      }
      let add = wallet.revenueNairaBalance + amount;
      add = await util.roundUp(add);
      logger.info(add);
      const updatedWallet = await new WalletService().updateTNSWallet({ userId }, { revenueNairaBalance: add });
      logger.info(updatedWallet);
      if (updatedWallet.revenueNairaBalance === add) {
        await successTransactionHandler(await util.roundUp(amount), 'updated revenue wallet',
          'funded TNS NAIRA wallet for revenue', 'credit', userId);
        return resolve(true);
      }
      return resolve(false);
    }
    if (currency === Constant.DOLLAR) {
      let add = wallet.revenueDollarBalance + amount;
      add = await util.roundUp(add);
      logger.info(add);
      const updatedWallet = await new WalletService().updateTNSWallet({ userId }, { revenueDollarBalance: add });
      logger.info(updatedWallet);
      if (updatedWallet.revenueDollarBalance === add) {
        await successTransactionHandler(await util.roundUp(amount), 'updated revenue wallet',
          'funded TNS DOLLAR wallet for revenue', 'credit', userId);
        return resolve(true);
      }
      return resolve(false);
    }

    if (currency === Constant.EURO) {
      let add = wallet.revenueEuroBalance + amount;
      add = await util.roundUp(add);
      logger.info(add);
      const updatedWallet = await new WalletService().updateTNSWallet({ userId }, { revenueEuroBalance: add });
      logger.info(updatedWallet);
      if (updatedWallet.revenueEuroBalance === add) {
        await successTransactionHandler(await util.roundUp(amount), 'updated revenue wallet',
          'funded TNS UERO wallet for revenue', 'credit', userId);
        return resolve(true);
      }
      return resolve(false);
    }

    if (currency === Constant.POUNDS) {
      let add = wallet.revenuePoundsBalance + amount;
      add = await util.roundUp(add);
      logger.info(add);
      const updatedWallet = await new WalletService().updateTNSWallet({ userId }, { revenuePoundsBalance: add });
      logger.info(updatedWallet);
      if (updatedWallet.revenuePoundsBalance === add) {
        await successTransactionHandler(await util.roundUp(amount), 'updated revenue wallet',
          'funded TNS POUNDS wallet for revenue', 'credit', userId);
        return resolve(true);
      }
      return resolve(false);
    }
    return reject(Error('currency type not recognized'));
  } catch (error) {
    return reject(error);
  }
});

module.exports.addMoneyToEveryPartner = async (arrayOfProductIds, currency, multiplier) => new Promise(async (resolve, reject) => {
  try {
    const arrayOfSeenproductTitles = [];
    logger.info(arrayOfProductIds);
    await arrayOfProductIds.forEach(async (productId, index, array) => {
      const product = await new ProductService().getProduct({ _id: productId, status: 'active' });
      if (product) {
        logger.info(product);
        const { productCost, partnerId } = product;
        const wallet = await new WalletService().getPartnerWallet({ userId: partnerId });
        logger.info(wallet);
        if (currency === Constant.NAIRA) {
          let add = wallet.nairaBalance + (productCost * multiplier);
          add = await util.roundUp(add);
          logger.info(add);
          const updatedWallet = await new WalletService().updatePartnerWallet({ userId: partnerId }, { nairaBalance: add });
          logger.info(updatedWallet);
          arrayOfSeenproductTitles.push(product.productTitle);
          await successTransactionHandler(await util.roundUp((productCost * multiplier)), 'partner publication credit',
            Constant.NAIRA_TRANSACTION_DETAIL, 'credit', partnerId);
        }

        if (currency === Constant.DOLLAR) {
          let add = wallet.dollarBalance + (productCost * multiplier);
          add = await util.roundUp(add);
          logger.info(add);
          const updatedWallet = await new WalletService().updatePartnerWallet({ userId: partnerId }, { dollarBalance: add });
          logger.info(updatedWallet);
          arrayOfSeenproductTitles.push(product.productTitle);
          await successTransactionHandler(await util.roundUp((productCost * multiplier)), 'partner publication credit',
            Constant.DOLLAR_TRANSACTION_DETAIL, 'credit', partnerId);
        }

        if (currency === Constant.EURO) {
          let add = wallet.euroBalance + (productCost * multiplier);
          add = await util.roundUp(add);
          logger.info(add);
          const updatedWallet = await new WalletService().updatePartnerWallet({ userId: partnerId }, { euroBalance: add });
          logger.info(updatedWallet);
          arrayOfSeenproductTitles.push(product.productTitle);
          await successTransactionHandler(await util.roundUp((productCost * multiplier)), 'partner publication credit',
            Constant.EURO_TRANSACTION_DETAIL, 'credit', partnerId);
        }

        if (currency === Constant.POUNDS) {
          let add = wallet.poundsBalance + (productCost * multiplier);
          add = await util.roundUp(add);
          logger.info(add);
          const updatedWallet = await new WalletService().updatePartnerWallet({ userId: partnerId }, { poundsBalance: add });
          logger.info(updatedWallet);
          arrayOfSeenproductTitles.push(product.productTitle);
          await successTransactionHandler(await util.roundUp((productCost * multiplier)), 'partner publication credit',
            Constant.POUNDS_TRANSACTION_DETAIL, 'credit', partnerId);
        }
      }
      logger.info(arrayOfSeenproductTitles);
      if (index === array.length - 1) return resolve(arrayOfSeenproductTitles);
    });
  } catch (error) {
    return reject(error);
  }
});

module.exports.calculateTotalMoneyForProducts = async (arrayOfProductIds, multiplier, discount) => new Promise(async (resolve, reject) => {
  try {
    let totalAmount = 0;
    await arrayOfProductIds.forEach(async (productId, index, array) => {
      const product = await new ProductService().getProduct({ _id: productId, status: 'active' });
      if (product) {
        logger.info(product);
        totalAmount += (product.productPrice * multiplier) - (product.productPrice * discount);
      }
      if (index === array.length - 1) return resolve(await util.roundUp(totalAmount));
    });
  } catch (error) {
    return reject(error);
  }
});

module.exports.calculateProductCostMoney = async (arrayOfProductIds, multiplier) => new Promise(async (resolve, reject) => {
  try {
    let totalAmount = 0;
    await arrayOfProductIds.forEach(async (productId, index, array) => {
      const product = await new ProductService().getProduct({ _id: productId, status: 'active' });
      if (product) {
        totalAmount += (product.productCost * multiplier);
      }
      if (index === array.length - 1) return resolve(await util.roundUp(totalAmount));
    });
  } catch (error) {
    return reject(error);
  }
});

module.exports.moveMoneyBetweenWallets = async (from, amount, to) => new Promise(async (resolve, reject) => {
  try {
    const fromWallet = await new WalletService().getCustomerWallet({ userId: from });
    const toWallet = await new WalletService().getCustomerWallet({ userId: to });
    logger.info(fromWallet);
    logger.info(toWallet);
    if (!fromWallet || !toWallet) {
      const error = new Error();
      error.error = true;
      error.message = 'error occoured when getting wallet';
      return reject(error);
    }
    const deduct = fromWallet.amount - amount;
    const addedValue = toWallet.amount + amount;
    const updatedFromWallet = await new WalletService().updateWallet({ userId: from }, { amount: deduct });
    logger.info(updatedFromWallet);

    const updatedToWallet = await new WalletService().updateWallet({ userId: to }, { amount: addedValue });
    logger.info(updatedToWallet);
    if (updatedToWallet.amount === addedValue) {
      return resolve(true);
    }
    return resolve(false);
  } catch (error) {
    return reject(error);
  }
});

async function successTransactionHandler(amount, title, detail, side, userId) {
  const transaction = {
    status: 'success',
    amount,
    transactionId: shortid.generate(),
    transactionTitle: title,
    detail,
    side,
    userId,
  };
  const savedResponse = await new TransactionService().addTransaction(transaction);
  logger.info(savedResponse);
}

module.exports.userfields = [
  'email', 'firstname', 'lastname',
  'phoneNumber', 'password', 'role',
];

module.exports.partnerfields = [
  'email', 'firstname', 'lastname', 'dob', 'phoneNumber',
  'password', 'country', 'cacNumber', 'companyName', 'role',
  'companyAddress', 'companyPhoneNumber', 'companyEmail', 'creatorId',
];

module.exports.neededPartnerUserFields = [
  'email', 'firstname', 'lastname', 'phoneNumber',
  'creatorId', 'password', 'role', 'creatorId',
];

module.exports.coopParentfields = [
  'email', 'firstname', 'lastname', 'dob', 'phoneNumber',
  'password', 'country', 'cacNumber', 'companyName',
  'companyAddress', 'companyPhoneNumber', 'companyEmail',
];

module.exports.indParentfields = [
  'email', 'firstname', 'lastname', 'dob',
  'password', 'country', 'phoneNumber',
];

module.exports.indChildfields = [
  'email', 'firstname', 'lastname',
  'password', 'phoneNumber', 'country',
];

module.exports.coopChildfields = [
  'email', 'phoneNumber', 'country',
  'firstname', 'lastname',
];

module.exports.productCreationFeilds = [
  'productTitle', 'productDescription', 'numberOfPages',
  'productType', 'productCost', 'partnerId',
];

module.exports.bundleCreationFeilds = [
  'numberOfProduct', 'numberOfNewspaper', 'numberOfMagazine',
  'priceOfBundle', 'bundleName', 'creatorId',
];

module.exports.upload = multer({ storage, fileFilter, limits: { fileSize: maxSize } }).single('profilePic');

module.exports.uploadChildren = multer({ storage, fileFilter: childBulkFilter, limits: { fileSize: maxSize } }).single('children');

module.exports.uploadProduct = multer({ storage, fileFilter, limits: { fileSize: maxSize } }).single('image');
