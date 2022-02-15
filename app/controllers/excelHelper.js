/* eslint-disable array-callback-return */
const Excel = require('exceljs');
const logger = require('../lib/logger');

module.exports.payoutExcelHelper = async function payoutExcelHelper(data, filename) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Payout', { properties: { tabColor: { argb: 'FFC0000' } } });

  worksheet.columns = [
    { header: 'WalletId', key: 'walletId', width: 14 },
    { header: 'Company Name', key: 'companyName', width: 22 },
    { header: 'Company Address', key: 'companyAddress', width: 15 },
    { header: 'Company Email', key: 'companyEmail', width: 10 },
    { header: 'Company PhoneNumber', key: 'companyPhoneNumber', width: 32 },
    { header: 'Profile Picture', key: 'profilePic', width: 15 },
    { header: 'Partner Id', key: 'partnerId', width: 14 },
    { header: 'CAC Number', key: 'cacNumber', width: 22 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Naira Balance', key: 'nairaBalance', width: 10 },
    { header: 'Dollar Balance', key: 'dollarBalance', width: 15 },
    { header: 'Euro Balance', key: 'euroBalance', width: 22 },
    { header: 'Pounds Balance', key: 'poundsBalance', width: 15 },
    { header: 'bank', key: 'bank', width: 10 },
    { header: 'Account Name', key: 'accountName', width: 32 },
    { header: 'Account Number', key: 'accountNumber', width: 15 },
  ];

  data.forEach(async (element) => {
    worksheet.addRow(element);
  });

  // write file in a specified directory
  await workbook.xlsx.writeFile(`./app/controllers/jobs/${filename}`);
  logger.info('payout file is written');
  return true;
};

module.exports.excelTransactionHelper = async function excelTransactionHelper(data, filename) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Transaction');

  worksheet.columns = [
    { header: 'Database Id', key: '_id', width: 25 },
    { header: 'Transaction Id', key: 'transactionId', width: 14 },
    { header: 'Transaction Title', key: 'transactionTitle', width: 30 },
    { header: 'Detail', key: 'detail', width: 60 },
    { header: 'Amount', key: 'amount', width: 8 },
    { header: 'User Id', key: 'userId', width: 15 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Side', key: 'side', width: 7 },
    { header: 'Transaction Date', key: 'createdAt', width: 20 },
  ];

  data.forEach(async (element) => {
    worksheet.addRow(element);
  });

  // write file in a specified directory
  await workbook.xlsx.writeFile(`./app/controllers/${filename}`);
  logger.info('transaction file is written');
  return true;
};
