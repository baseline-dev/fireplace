import '../../test/_env';
import test from 'tape';
import setupFixtures from '@baseline-dev/gaffertape';
import {createAccountFixture} from '../../test/fixtures/account';
import {login} from './auth';


test('Login without setting password fails', setupFixtures(
    createAccountFixture(),
    async (t, ctx) => {
        t.plan(1);
        try {
            await login(ctx.account.email, '123123321');
        } catch(e) {
            t.equal(e.message, 'Please activate your account before you login.');
        }
    }
));