import '../../test/_env';
import test from 'tape';
import faker from 'faker';
import setupFixtures from '@baseline-dev/gaffertape';
import { createAccountFixture } from '../../test/fixtures/account';
import { login } from './auth';


test('Login without setting password fails', setupFixtures(
  createAccountFixture(),
  async (t, ctx) => {
    t.plan(1);
    try {
      await login(ctx.account.email, '123123321');
    } catch (e) {
      t.equal(e.message, 'Please activate your account before you login.');
    }
  }
));

test('login rejects invalid password', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async (t, ctx) => {
    t.plan(1);
    try {
      const result = await login(ctx.account.email, '123123321');
    } catch (e) {
      t.equal(e.message, 'The password provided was not accepted.');
    }
  }
));

test('login succeeds with valid password', setupFixtures(
  createAccountFixture({
    password: '12345678',
    email: faker.internet.exampleEmail(),
    fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
    scope: ['user']
  }, true),
  async (t, ctx) => {
    t.plan(2);
    const {result, statusCode} = await login(ctx.account.email, '12345678');
    
    t.equal(statusCode, 200);
    t.equal(result.id, ctx.account.id);
  }
));