import faker from 'faker';
import { createAccount, deleteAccount, setupAccountPassword } from '../../src/account';

function createAccountFixture(accountProps, validate) {
  return async function (ctx) {
    accountProps = accountProps || {
      password: '12345678',
      email: faker.internet.exampleEmail(),
      fullName: `${faker.name.firstName()} ${faker.name.lastName()}`,
      scope: ['user']
    };

    const { result } = await createAccount(accountProps);
    ctx.account = result.account;
    ctx.account._hash = result.hash;

    if (validate) {
      await setupAccountPassword(result.hash, accountProps.password);
    }

    if (!ctx.accounts) ctx.accounts = [];
    ctx.accounts.push(ctx.account);

    ctx._teardown.push(async (ctx) => {
      try {
        await deleteAccount(result.id);
      } catch (e) { }
    })
  }
}

export {
  createAccountFixture
}