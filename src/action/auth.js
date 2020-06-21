import {getAccountByEmail, isValidPassword} from '../data-access/account';
import {BaselineError} from '../lib/error';
import {BaselineResponse} from '../lib/response';

async function login(email, password) {
  try {
    const {result} = await getAccountByEmail(email);
    
    if (result.status !== 'active') {
      throw new BaselineError({
        statusCode: 400,
        message: 'Please activate your account before you login.',
        errors: []
      })
    }

    const isValid = await isValidPassword(result.id, password);

    if (!isValid) {
      throw new BaselineError({
        statusCode: 401,
        message: 'The password provided was not accepted.',
        errors: [{
          field: 'password',
          message: 'The password provided was not accepted.'
        }]
      })
    }

    return new BaselineResponse({
      statusCode: 200,
      result
    })
  } catch(e) {
    throw e;
  }
}

export {
  login
}