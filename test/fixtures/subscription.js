import {createUser, deleteUser, setupUserPassword} from '../../src/data-access/user';
import faker from 'faker';

function createSubscriptionFixture(subscriptionProps) {
  return async function(ctx) {
    const user = ctx.user;

    ctx.subscription = {};

    if (!ctx.subscriptions) ctx.subscriptions = [];
    ctx.subscriptions.push(ctx.subscription);

    ctx._teardown.push(async (ctx) => {
      try {
        //
      } catch(e) {}
    })
  }
}

export {
  createSubscriptionFixture
}