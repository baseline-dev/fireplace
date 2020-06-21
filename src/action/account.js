import config from 'config';

import { createAccount, deleteAccount } from '../data-access/account';
import { sendEmail } from '../lib/send-email';
import { BaselineResponse } from '../lib/response';
import { getGreeting } from '../lib/human-names';
import { cancelSubscription } from './subscription'
import {
  requestPasswordReset as requestReset,
  requestEmailChange as requestEmail
} from '../data-access/account';

async function setupAccount(accountProps) {
  try {
    accountProps.scope = ['user'];

    const { result, statusCode } = await createAccount(accountProps);

    const account = result.account;
    const hash = result.hash;

    const from = config.email.from;
    const to = account.email;
    const subject = 'Welcome to Baseline';
    const templateText = 'activateAccount.txt';
    const templateProps = {
      greeting: getGreeting(account.fullName),
      activateUrl: `${config.serviceUrl}/account/activate/${hash}`
    };

    await sendEmail(from, to, subject, templateText, templateProps);

    return new BaselineResponse({
      statusCode,
      result: result.account
    })
  } catch (e) {
    throw e;
  }
}

async function requestPasswordReset(email) {
  try {
    const { result, statusCode } = await requestReset(email);

    const account = result.account;
    const hash = result.hash;

    const from = config.email.from;
    const to = account.email;
    const subject = 'Reset your Baseline password';
    const templateText = 'passwordReset.txt';
    const templateProps = {
      greeting: getGreeting(account.fullName),
      resetUrl: `${config.serviceUrl}/account/password/reset/${hash}`
    };

    await sendEmail(from, to, subject, templateText, templateProps);

    return new BaselineResponse({
      statusCode,
      result: result.account
    })
  } catch (e) {
    throw e;
  }
}

async function requestEmailChange(accountId, email) {
  try {
    const { result, statusCode } = await requestEmail(accountId, email);

    const account = result.account;
    const hash = result.hash;

    const from = config.email.from;
    const toConfirm = email;
    const subjectConfirm = 'Confirm your new email address for Baseline';
    const templateTextConfirm = 'emailChange.txt';
    const templatePropsConfirm = {
      greeting: getGreeting(account.fullName),
      resetUrl: `${config.serviceUrl}/account/email/confirm/${hash}`
    };

    await sendEmail(from, toConfirm, subjectConfirm, templateTextConfirm, templatePropsConfirm);

    const toOld = account.email;
    const subjectOld = 'You requested to change your Baseline email';
    const templateTextOld = 'emailChangePreviousAddress.txt';
    const templatePropsOld = {
      greeting: getGreeting(account.fullName),
      newEmail: email
    };

    await sendEmail(from, toOld, subjectOld, templateTextOld, templatePropsOld);

    return new BaselineResponse({
      statusCode,
      result: result.account
    })
  } catch (e) {
    throw e;
  }
}

async function deleteAccount(id) {
  try {
    const subscriptionResponse = await cancelSubscription(id);
    await deleteAccount(id);

    return new BaselineResponse({
      statusCode: 204
    });
  } catch (e) {
    throw e;
  }
}

export {
  setupAccount,
  requestPasswordReset,
  requestEmailChange,
  deleteAccount
}