import {
  getAccount,
  getAccountByEmail,
  createAccount,
  deleteAccount,
  updateAccount,
  updatePassword,
  isValidPassword,
  requestEmailChange,
  updateEmailWithToken,
  requestPasswordReset,
  updatePasswordWithToken,
  setupAccountPassword
} from './data-access/account';

if (!process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME) {
  throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_TABLENAME'.`);
}

if (!process.env.BASELINE_FIREPLACE_DYNAMODB_REGION) {
  throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_REGION'.`);
}

export {
  getAccount,
  getAccountByEmail,
  createAccount,
  deleteAccount,
  updateAccount,
  updatePassword,
  isValidPassword,
  requestEmailChange,
  updateEmailWithToken,
  requestPasswordReset,
  updatePasswordWithToken,
  setupAccountPassword
}