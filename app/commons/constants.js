
module.exports = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  USER_ADMIN: 'user-admin',
  PARTNER_ADMIN: 'partner-admin',
  USER: 'user',
  CUSTOMER_IND_CHILD: 'individual-child',
  CUSTOMER_COOP_CHILD: 'cooperate-child',
  CUSTOMER_IND_PARENT: 'individual-parent',
  CUSTOMER_COOP_PARENT: 'cooperate-parent',
  BUCKET_NAME: 'the-newspaper-stand-bucket',
  LOCAL: 'nigeria',
  EURO: 'euro',
  DOLLAR: 'dollar',
  NAIRA: 'naira',
  POUNDS: 'pounds',
  BLUSALT_WALLET_ID: process.env.BLUSALT_WALLET_ID || 'blusaltfinancialservice',
  SETTING_ID: process.env.SETTING_ID || 'settingid001',
  TNS_WALLET_ID: process.env.TNS_WALLET_ID || 'basetnswalletid',
  BLUSALT_WALLET_CHARGE: 10,
  NAIRA_TRANSACTION_DETAIL: 'funded partner NAIRA wallet for publication purchase',
  DOLLAR_TRANSACTION_DETAIL: 'funded partner DOLLAR wallet for publication purchase',
  POUNDS_TRANSACTION_DETAIL: 'funded partner POUNDS wallet for publication purchase',
  EURO_TRANSACTION_DETAIL: 'funded partner EURO wallet for publication purchase',

  CACHE_KEY: {
    PASSWORD_TOKEN: 'password_token',
  },
};