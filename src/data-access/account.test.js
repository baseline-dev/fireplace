import '../../test/_env';
import test from 'tape';
import setupFixtures from '@baseline-dev/gaffertape';

import {
  createAccount,
  deleteAccount,
  getAccount,
  isValidPassword,
  updateAccount,
  getAccountByEmail,
  updatePassword,
  requestEmailChange, updateEmailWithToken, requestPasswordReset, updatePasswordWithToken, setupAccountPassword
} from './account';
import faker from 'faker';
import {createAccountFixture} from '../../test/fixtures/account';

test('createAccount validation', async function (t) {
  t.plan(7);
  try {
    const account = await createAccount({
      password: '45678',
      email: 123,
      fullName: undefined
    });
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.message, 'Validation failed.');
    t.equal(e.name, 'BaselineError');
    t.equal(e.errors.length, 3);
    t.equal(e.errors[0].message, 'Please provide a valid email.');
    t.equal(e.errors[1].message, 'Please provide your name.');
    t.equal(e.errors[2].message, 'Please provide the account scope.');
  }
});

test('createAccount', async function (t) {
  t.plan(11);
  try {
    const {result, statusCode} = await createAccount({
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    t.equal(statusCode, 201);
    t.equal(result.account.fullName, 'Hi there');
    t.ok(result.account.id, 'ID should be returned');
    t.ok(result.account.email, 'Email should be returned');
    t.equal(result.account.scope.length, 1, 'Account scope is returned');
    t.equal(result.account.scope[0], 'user', 'Scope should equal `user`');
    t.equal(result.account.status, 'setup');
    t.ok(result.account.createdAt, 'createdAt should be returned');
    t.ok(result.account.updatedAt, 'updatedAt should be returned');
    t.notOk(result.account.password, 'Password should not be set.');
    t.ok(result.hash, 'Email verification hash should exist.');

    await deleteAccount(result.account.id);
  } catch(e) {
    t.fail('Should not get here');
  }
});

test('setupAccountPassword validates no input', async (t) => {
  t.plan(6);
  try {
    await setupAccountPassword();
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.message, 'Validation failed.');
    t.equal(e.name, 'BaselineError');
    t.equal(e.errors.length, 2);
    t.equal(e.errors[0].message, 'Please provide the token.');
    t.equal(e.errors[1].message, 'Please provide a password.');
  }
});

test('setupAccountPassword validates invalid input', async (t) => {
  t.plan(5);
  try {
    await setupAccountPassword('123', '123');
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.message, 'Validation failed.');
    t.equal(e.name, 'BaselineError');
    t.equal(e.errors.length, 1);
    t.equal(e.errors[0].message, 'Your password should be at least 7 characters long.');
  }
});

test('setupAccountPassword validates invalid input', async (t) => {
  t.plan(2);
  try {
    await setupAccountPassword('123', '123123123');
  } catch(e) {
    t.equal(e.statusCode, 404);
    t.equal(e.message, 'You provided an invalid token to setup your account.');
  }
});

test('setupAccountPassword sets password and account status to `active`', setupFixtures(
  createAccountFixture(),
  async (t, ctx) => {
    t.plan(3);
    try {
      const {statusCode} = await setupAccountPassword(ctx.account._hash, '123123123');
      t.equal(statusCode, 200);

      const response = await getAccount(ctx.account.id);
      t.equal(response.result.status, 'active');

      const isValid = await isValidPassword(ctx.account.id, '123123123');
      t.equal(isValid, true);
    } catch(e) {}
  }
));

test('setupAccountPassword returns account with id property', setupFixtures(
  createAccountFixture(),
  async (t, ctx) => {
    t.plan(2);
    try {
      const {statusCode, result} = await setupAccountPassword(ctx.account._hash, '123123123');
      t.equal(statusCode, 200);
      t.equal(result.account.id, ctx.account.id);
    } catch(e) {}
  }
));

test('getAccount which does not exist', async function (t) {
  t.plan(3);
  try {
    await getAccount('123');
  } catch(e) {
    t.equal(e.statusCode, 404);
    t.equal(e.message, 'The account with id "123" does not exist.');
    t.equal(e.errors.length, 0);
  }
});

test('getAccount', async function (t) {
  t.plan(9);

  try {
    const response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const {statusCode, result} = await getAccount(response.result.account.id);

    t.equal(statusCode, 200);
    t.equal(result.fullName, 'Hi there');
    t.ok(result.email, 'Email should be returned');
    t.ok(result.id, 'Id should be returned');
    t.equal(result.scope.length, 1, 'Scope should have one item');
    t.equal(result.scope[0], 'user', 'Scope should be set to `user`');
    t.ok(result.createdAt, 'createdAt should be returned');
    t.ok(result.updatedAt, 'updatedAt should be returned');
    t.notOk(result.password, 'Password should not be returned.');

    await deleteAccount(response.result.account.id);
  } catch(e) {
    t.fail('Should not get here');
  }
});

test('updateAccount which does not exist', async function (t) {
  t.plan(2);
  try {
    await updateAccount('123', {
      fullName: 'Cooleo'
    });

    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'The account with id "123" does not exist.');
    t.equal(e.statusCode, 404);
  }
});

test('updateAccount updates attributes', setupFixtures(
  createAccountFixture(),
  async function (t, ctx) {
    t.plan(4);
    try {
      const {result, statusCode} = await updateAccount(ctx.account.id, {
        fullName: 'Cooleo',
        billing: {
          customer: {
            id: 2
          }
        }
      });

      t.equal(result.id, ctx.account.id);
      t.equal(result.fullName, 'Cooleo');
      t.equal(result.billing.customer.id, 2);
      t.notEqual(result.createdAt, result.updatedAt);
    } catch(e) {
      t.fail('Should not get here');
    }
  }
));

test('updateAccount allows to update nested billing attributes', setupFixtures(
  createAccountFixture({
    email: faker.internet.exampleEmail(),
    fullName: 'Hi',
    password: '123123123',
    scope: ['user'],
    billing: {
      customer: {
        id: 2,
        name: 'Hi'
      },
      subscription: {
        id: 3,
        status: 'trial'
      }
    }
  }, true),
  async (t, ctx) => {
    t.plan(5);
    
    t.equal(ctx.account.billing.subscription.status, 'trial');

    const {result} = await updateAccount(ctx.account.id, {
      billing: {
        subscription: {
          id: 3,
          status: 'active'
        }
      }
    });

    t.equal(result.billing.subscription.status, 'active');
    t.equal(result.billing.subscription.id, 3);
    t.equal(result.billing.customer.id, 2);
    t.equal(result.billing.customer.name, 'Hi');
  }
));

test('updateAccount does not allow to update id', setupFixtures(
  createAccountFixture(),
  async function (t, ctx) {
    t.plan(2);
    try {
      const {result, statusCode} = await updateAccount(ctx.account.id, {
        id: '123'
      });

      t.equal(result.id, ctx.account.id);
      t.notEqual(result.id, '123');
    } catch(e) {
      t.fail('Should not get here');
    }
  }
));

test('updateAccount does not update random attributes', setupFixtures(
  createAccountFixture(),
  async function (t, ctx) {
    t.plan(5);
    try {
      const {result, statusCode} = await updateAccount(ctx.account.id, {
        fullName: 'Cooleo',
        a: 2,
        b: 7
      });

      t.equal(result.id, ctx.account.id);
      t.equal(result.fullName, 'Cooleo');
      t.notEqual(result.createdAt, result.updatedAt);
      t.notOk(result.a);
      t.notOk(result.b);
    } catch(e) {
      t.fail('Should not get here');
    }
  }
));

test('deleteAccount which does not exist', async function (t) {
  t.plan(2);
  try {
    await deleteAccount('123');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'The account with id "123" does not exist.');
    t.equal(e.statusCode, 404);
  }
});

test('deleteAccount with invalid id', async (t) => {
  t.plan(3);
  try {
    await deleteAccount(123);
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'Validation failed.');
    t.equal(e.statusCode, 400);
    t.equal(e.errors.length, 1);
  }
});

test('deleteAccount with valid id', async (t) => {
  t.plan(2);
  try {
    const _response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const response = await deleteAccount(_response.result.account.id);
    t.equal(response.statusCode, 204);
    t.notOk(response.message);
  } catch(e) {
    t.fail('Should not get here');
  }
});

test('isValidPassword fails with wrong password', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async (t, ctx) => {
    t.plan(1);
    try {
      const isValid = await isValidPassword(ctx.account.id, '12345679');
      t.notOk(isValid);
    } catch(e) {
      t.fail('Should not get here');
    }
  }
));

test('isValidPassword succeeds with correct password', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async (t, ctx) => {
    t.plan(1);
    try {
      const response = await createAccount({
        password: '12345678',
        email: faker.internet.exampleEmail(),
        fullName: 'Hi there',
        scope: ['user']
      });

      const isValid = await isValidPassword(ctx.account.id, '12345678');
      t.ok(isValid);
    } catch(e) {
      t.fail('Should not get here');
    }
  }
));

test('isValidPassword returns error with unknown account', async (t) => {
  t.plan(2);
  try {
    const isValid = await isValidPassword('123', '12345678');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'The account with id "123" does not exist.');
    t.equal(e.statusCode, 404);
  }
});

test('isValidPassword returns error with invalid password', async (t) => {
  t.plan(3);
  try {
    const isValid = await isValidPassword(123, '12');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'Validation failed.');
    t.equal(e.statusCode, 400);
    t.equal(e.errors.length, 2);
  }
});

test('getAccountByEmail returns account if account exists', async (t) => {
  t.plan(2);
  try {
    const email = faker.internet.exampleEmail();
    const _response = await createAccount({
      email,
      password: '12345678',
      fullName: 'Hi there',
      scope: ['user']
    });
    const response = await getAccountByEmail(_response.result.account.email);

    t.equal(response.result.email, email);
    t.equal(response.result.fullName, 'Hi there');

    await deleteAccount(_response.result.account.id);
  } catch(e) {
    t.fail('Should not get here');
  }
});

test('getAccountByEmail returns 400 if invalid email gets passed', async (t) => {
  t.plan(3);
  try {
    const response = await getAccountByEmail('fdsa');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.message, 'Validation failed.');
    t.equal(e.errors.length, 1);
  }
});

test('getAccountByEmail returns 404 if invalid email gets passed', async (t) => {
  t.plan(2);
  try {
    const response = await getAccountByEmail('fdsa@fdsa.com');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 404);
    t.equal(e.message, 'The account with email "fdsa@fdsa.com" does not exist.');
  }
});

test('updatePassword returns 404 if invalid user id gets passed', async (t) => {
  t.plan(2);
  try {
    const response = await updatePassword('123', '1234567', '1234567');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 404);
    t.equal(e.message, 'The account with id "123" does not exist.');
  }
});

test('updatePassword validates password input', async (t) => {
  t.plan(3);
  try {
    const response = await updatePassword('123', '2', '2');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.message, 'Validation failed.');
    t.equal(e.errors.length, 1);
  }
});

test('updatePassword fails when invalid password is provided', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async (t, ctx) => {
    t.plan(3);
    let _response;
    try {
      await updatePassword(ctx.account.id, '12345sdsdsds', '2dsdsdsdsdsds');
      t.fail('Should not get here');
    } catch(e) {
      t.equal(e.statusCode, 400);
      t.equal(e.message, 'Validation failed.');
      t.equal(e.errors[0].message, 'The password provided is not valid.');
    }
  }
));

test('updatePassword validates current password', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async (t, ctx) => {
    t.plan(1);
    try {
      await updatePassword(ctx.account.id, '12345678', '87654321');
      const isValid = await isValidPassword(ctx.account.id, '87654321');
      t.ok(isValid);
    } catch(e) {
      t.fail('Should not get here');
    }
  }
));

test('requestEmailChange validates input', async (t) => {
  t.plan(2);
  try {
    await requestEmailChange();
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.errors.length, 2);
  }
});

test('requestEmailChange fails is unknown account is provided', async (t) => {
  t.plan(2);
  try {
    const _user = await requestEmailChange('123', 'foo@example.com');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 404);
    t.equal(e.message, 'The account with id "123" does not exist.');
  }
});

test('requestEmailChange returns hash to reset email', async (t) => {
  t.plan(3);
  try {
    const _response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const response = await requestEmailChange(_response.result.account.id, 'foo@example.com');
    t.equal(response.statusCode, 201);
    t.equal(response.result.account.id, _response.result.account.id);
    t.ok(response.result.hash);

    await deleteAccount(_response.result.account.id);
  } catch(e) {
    t.fail('Should not get here', e);
  }
});

test('updateEmailWithToken validates input', async (t) => {
  t.plan(2);
  try {
    const response = await updateEmailWithToken();
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.errors.length, 1);
    t.equal(e.statusCode, 400);
  }
});

test('updateEmailWithToken returns 404 for invalid hash', async (t) => {
  t.plan(2);
  try {
    const response = await updateEmailWithToken('123');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'You provided an invalid token to reset your email.');
    t.equal(e.statusCode, 404);
  }
});

test('updateEmailWithToken does not allow to update to an existing email', async(t) => {
  t.plan(2);
  let responseOne, responseTwo;
  try {
    const emailOne = faker.internet.exampleEmail();
    const emailTwo = faker.internet.exampleEmail();

    responseOne = await createAccount({
      password: '12345678',
      email: emailOne,
      fullName: 'Hi there',
      scope: ['user']
    });

    const tokenResponse = await requestEmailChange(responseOne.result.account.id, emailTwo);

    responseTwo = await createAccount({
      password: '12345678',
      email: emailTwo,
      fullName: 'Hi yo',
      scope: ['user']
    });

    const {result, statusCode} = await updateEmailWithToken(tokenResponse.result.hash);

    t.fail('Should not get here', e);

  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.message, 'We were not able to update the accounts email. The email is already in use.');
    await deleteAccount(responseOne.result.account.id);
    await deleteAccount(responseTwo.result.account.id);
  }
});

test('updateEmailWithToken updates email.', async (t) => {
  t.plan(1);
  try {
    const newEmail = faker.internet.exampleEmail();
    const response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const tokenResponse = await requestEmailChange(response.result.account.id, newEmail);
    const {result, statusCode} = await updateEmailWithToken(tokenResponse.result.hash);

    t.equal(statusCode, 200);

    await deleteAccount(response.result.account.id);
  } catch(e) {
    t.fail('Should not get here', e);
  }
});

test('updateEmailWithToken does not update expired token.', async (t) => {
  t.plan(2);
  let response;
  try {
    const newEmail = 'foo@example.com';
    response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const twoDays = 60 * 60 * 48;
    const tokenResponse = await requestEmailChange(response.result.account.id, newEmail);
    await updateEmailWithToken(tokenResponse.result.hash, Math.round((new Date).getTime() / 1000) + twoDays);

    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'The token to reset your email has expired.');
    t.equal(e.statusCode, 401);
    await deleteAccount(response.result.account.id);
  }
});

test('updateEmailWithToken sets new email.', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async(t, ctx) => {
    t.plan(2);
    try {
      const newEmail = faker.internet.exampleEmail();
      const {result} = await requestEmailChange(ctx.account.id, newEmail);

      const {statusCode} = await updateEmailWithToken(result.hash);
      t.equal(statusCode, 200);

      const _response = await getAccount(ctx.account.id);
      t.equal(_response.result.email, newEmail);
    } catch(e) {
      t.fail('Should not get here', e);
    }
  }
));

test('requestPasswordReset validates input', async (t) => {
  t.plan(2);
  try {
    await requestPasswordReset();
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 400);
    t.equal(e.errors.length, 1);
  }
});

test('requestPasswordReset fails is unknown user is provided', async (t) => {
  t.plan(2);
  try {
    await requestPasswordReset('123@fdsa.com');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.statusCode, 404);
    t.equal(e.message, 'The account with email "123@fdsa.com" does not exist.');
  }
});

test('requestPasswordReset returns hash and user to reset password', async (t) => {
  t.plan(3);
  try {
    const _response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const response = await requestPasswordReset(_response.result.account.email);

    t.equal(response.statusCode, 201);
    t.equal(response.result.account.id, _response.result.account.id);
    t.ok(response.result.hash);

    await deleteAccount(_response.result.account.id);
  } catch(e) {
    t.fail('Should not get here', e);
  }
});

test('updatePasswordWithToken validates input', async (t) => {
  t.plan(2);
  try {
    await updatePasswordWithToken();
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.errors.length, 2);
    t.equal(e.statusCode, 400);
  }
});

test('updatePasswordWithToken returns 404 for invalid hash', async (t) => {
  t.plan(2);
  try {
    const response = await updatePasswordWithToken('123', '123321123');
    t.fail('Should not get here');
  } catch(e) {
    t.equal(e.message, 'You provided an invalid token to reset your password.');
    t.equal(e.statusCode, 404);
  }
});

test('updatePasswordWithToken updates password.', async (t) => {
  t.plan(2);
  try {
    const _response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const tokenResponse = await requestPasswordReset(_response.result.account.email);
    const response = await updatePasswordWithToken(tokenResponse.result.hash, '98989898');

    const isValid = await isValidPassword(_response.result.account.id, '98989898');
    t.equal(isValid, true);
    t.equal(response.statusCode, 200);

    await deleteAccount(_response.result.account.id);
  } catch(e) {
    t.fail('Should not get here', e);
  }
});

test('updatePasswordWithToken does not update expired token.', async (t) => {
  t.plan(2);
  let _response;
  try {
    _response = await createAccount({
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: 'Hi there',
      scope: ['user']
    });

    const twoDays = 60 * 60 * 48;
    const tokenResponse = await requestPasswordReset(_response.result.account.email);
    await updatePasswordWithToken(tokenResponse.result.hash, '123123123', Math.round((new Date).getTime() / 1000) + twoDays);

    t.fail('Should not get here');

  } catch(e) {
    t.equal(e.message, `The token you provided is not valid.`);
    t.equal(e.statusCode, 401);
    await deleteAccount(_response.result.account.id);
  }
});