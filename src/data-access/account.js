import { ulid } from 'ulid';
import bcrypt from 'bcrypt';
import Validator from 'fastest-validator';
import { BaselineError } from '../lib/error';
import { translateValidationErrors } from '../lib/translate-validation-errors';
import { BaselineResponse } from '../lib/response';
import omit from 'lodash.omit';
import pick from 'lodash.pick';
import get from 'lodash.get';
import isEmpty from 'lodash.isempty';
import { transactWrite, docClient, tableName } from './client';
import accountSchema from './account-schema';

const validator = new Validator();

function getAccountProperties(item) {
  return {
    'id': item.pk.replace('ACCOUNT#', ''),
    'email': item.email,
    'fullName': item.fullName,
    'scope': item.scope,
    'status': item.status,
    'billing': item.billing,
    'createdAt': item.createdAt,
    'updatedAt': item.updatedAt
  }
}

async function hashPassword(password, attrs, options) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function getAccount(id) {
  const validation = validator.validate({ id }, pick(accountSchema, ['id']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const account = await docClient.get({
      TableName: tableName,
      Key: {
        'pk': `ACCOUNT#${id}`,
        'sk': `ACCOUNT#${id}`,
      }
    }).promise();

    if (!account.Item) {
      throw new BaselineError({
        statusCode: 404,
        message: `The account with id "${id}" does not exist.`
      });
    }

    return new BaselineResponse({
      statusCode: 200,
      result: getAccountProperties(account.Item)
    });
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    throw new BaselineError({
      message: `An error occured getting the account with id "${id}".`
    });
  }
}

async function getAccountByEmail(email) {
  const validation = validator.validate({ email }, pick(accountSchema, ['email']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const account = await docClient.get({
      TableName: tableName,
      Key: {
        'pk': `EMAIL#${email}`,
        'sk': `EMAIL#${email}`,
      }
    }).promise();

    if (!account.Item) {
      throw new BaselineError({
        statusCode: 404,
        message: `The account with email "${email}" does not exist.`
      });
    }
    return await getAccount(account.Item.accountId);
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    throw new BaselineError({
      message: `An error occured getting the account with email "${email}".`
    });
  }
}

function getBillingProperties(billingProps = {}) {
  if (!billingProps.customer) billingProps.customer = {};
  if (!billingProps.subscription) billingProps.subscription = {};
  return billingProps;
}

async function createAccount(account = {}) {
  account = pick(account, ['email', 'fullName', 'scope', 'billing']);
  const schema = pick(accountSchema, ['email', 'fullName', 'scope', 'billing']);
  const validation = validator.validate(account, schema);

  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  const dateTime = (new Date).toISOString();
  const changeEmailId = ulid();
  const oneDay = 60 * 60 * 24;
  const ttl = Math.round((new Date).getTime() / 1000) + oneDay;
  const accountProps = {
    'id': ulid(),
    'email': account.email,
    'fullName': account.fullName,
    'scope': account.scope,
    'status': 'setup',
    'billing': getBillingProperties(account.billing),
    'createdAt': dateTime,
    'updatedAt': dateTime
  };

  const params = {
    TransactItems: [{
      Put: {
        TableName: tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: {
          'pk': `ACCOUNT#${accountProps.id}`,
          'sk': `ACCOUNT#${accountProps.id}`,
          'email': accountProps.email,
          'password': accountProps.password,
          'fullName': accountProps.fullName,
          'scope': accountProps.scope,
          'status': accountProps.status,
          'billing': accountProps.billing,
          'createdAt': accountProps.createdAt,
          'updatedAt': accountProps.updatedAt
        }
      }
    }, {
      Put: {
        TableName: tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: {
          'pk': `EMAIL#${accountProps.email}`,
          'sk': `EMAIL#${accountProps.email}`,
          'accountId': accountProps.id,
          'createdAt': accountProps.createdAt,
          'updatedAt': accountProps.updatedAt
        }
      }
    }, {
      Put: {
        TableName: tableName,
        Item: {
          'pk': `SETUPACCOUNT#${changeEmailId}`,
          'sk': `SETUPACCOUNT#${changeEmailId}`,
          'accountId': accountProps.id,
          'createdAt': dateTime,
          'updatedAt': dateTime,
          'ttl': ttl
        }
      }
    }]
  };

  try {
    await transactWrite(params);
    return new BaselineResponse({
      result: {
        account: omit(accountProps, ['password']),
        hash: changeEmailId
      },
      statusCode: 201
    });
  } catch (err) {
    if (err instanceof BaselineError) throw e;

    let statusCode = 500;
    let errors = [];
    let message = 'An error occured creating a new account.';
    if (err.reasons && err.reasons[1] && err.reasons[1].Code === 'ConditionalCheckFailed') {
      errors.push({
        field: 'email',
        message: 'An account with this email address already exists.'
      })
      statusCode = 400;
    }

    throw new BaselineError({
      statusCode,
      message,
      errors
    });
  }
}

async function deleteAccount(id) {
  const validation = validator.validate({ id }, pick(accountSchema, ['id']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  const { result } = await getAccount(id);

  const params = {
    TransactItems: [{
      Delete: {
        TableName: tableName,
        Key: {
          'pk': `ACCOUNT#${result.id}`,
          'sk': `ACCOUNT#${result.id}`,
        }
      }
    }, {
      Delete: {
        TableName: tableName,
        Key: {
          'pk': `EMAIL#${result.email}`,
          'sk': `EMAIL#${result.email}`,
        }
      }
    }]
  };

  try {
    await docClient.transactWrite(params).promise();
    return new BaselineResponse({
      statusCode: 204
    })
  } catch (err) {
    throw new BaselineError({
      message: `An error occured deleting the account with id "${id}"`
    });
  }
}

function getUpdateProperties(accountProps) {
  // We don't allow for id to be updated.
  accountProps = omit(accountProps, 'id');
  return pick(accountProps, Object.keys(accountSchema));
}

function transformBillingProperties(props, key) {
  switch (key) {
    case 'subscription':
      const items = get(props.items, 'data') || [];
      return {
        ...pick(props, 'id', 'metadata', 'cancel_at_period_end', 'current_period_end', 'current_period_start', 'latest_invoice', 'status', 'cancel_at', 'canceled_at', 'created', 'days_until_due', 'trial_start', 'trial_end', 'start_date'),
        items: items.map((item) => {
          return {
            ...pick(item, 'id', 'object'),
            plan: pick(item.plan, 'id', 'active', 'currency', 'interval', 'interval_count', 'trial_period_days')
          }
        })
      }
    case 'customer':
      return {
        ...pick(props, 'id', 'metadata', 'email', 'balance')
      }
    default:
      return {}
  }
}

async function updateAccount(id, accountProps) {
  accountProps = getUpdateProperties(accountProps);
  const validateProps = pick(accountSchema, Object.keys(accountProps));

  const validation = validator.validate({ id, ...accountProps }, validateProps);

  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const updateExpression = ['updatedAt = :u'];
    const expressionValues = {
      ':u': (new Date).toISOString()
    };

    Object.keys(accountProps).forEach((prop) => {
      if (prop === 'billing') {
        for (const key in accountProps[prop]) {
          if (key === 'customer' || key === 'subscription') {
            updateExpression.push(`${prop}.${key} = :${prop}${key}`);
            expressionValues[`:${prop}${key}`] = transformBillingProperties(accountProps[prop][key], key);
          }
        }
      } else {
        updateExpression.push(`${prop} = :${prop}`);
        expressionValues[`:${prop}`] = accountProps[prop];
      }
    })

    const params = {
      TableName: tableName,
      Key: {
        'pk': `ACCOUNT#${id}`,
        'sk': `ACCOUNT#${id}`
      },
      UpdateExpression: `set ${updateExpression.join(', ')}`,
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW'
    };

    const account = await docClient.update(params).promise();

    if (!account.Attributes) {
      throw new BaselineError({
        statusCode: 404,
        message: `The account with id "${id}" does not exist.`
      });
    }

    return new BaselineResponse({
      statusCode: 200,
      result: getAccountProperties(account.Attributes)
    });
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    
    let message, statusCode;
    switch (e.name) {
      case 'ConditionalCheckFailedException':
        message = `The account with id "${id}" does not exist.`;
        statusCode = 404;
        break;
      default:
        message = `An error occured updating the account with id "${id}".`;
        statusCode = 500;
        break;
    }

    throw new BaselineError({
      statusCode,
      message
    });
  }
}

async function updatePassword(id, oldPassword, newPassword) {
  const validation = validator.validate({ id, password: newPassword }, pick(accountSchema, ['password', 'id']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation, {
    password: 'newPassword'
  }));

  try {
    const isValid = await isValidPassword(id, oldPassword);

    if (!isValid) {
      throw new BaselineError({
        statusCode: 400,
        message: 'Validation failed.',
        errors: [{
          field: 'password',
          message: 'The password provided is not valid.'
        }]
      })
    }

    const params = {
      TableName: tableName,
      Key: {
        'pk': `ACCOUNT#${id}`,
        'sk': `ACCOUNT#${id}`
      },
      UpdateExpression: 'set password = :p, updatedAt = :u',
      ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
      ExpressionAttributeValues: {
        ':p': await hashPassword(newPassword),
        ':u': (new Date).toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const account = await docClient.update(params).promise();

    if (!account.Attributes) {
      throw new BaselineError({
        statusCode: 404,
        message: `The account with id "${id}" does not exist.`
      });
    }

    return new BaselineResponse({
      statusCode: 200
    });
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    throw new BaselineError({
      statusCode: 500,
      message: `An error occured changing the password of the account with id "${id}".`
    });
  }
}

async function isValidPassword(id, password) {
  const validation = validator.validate({ id, password }, pick(accountSchema, ['password', 'id']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const account = await docClient.get({
      TableName: tableName,
      Key: {
        'pk': `ACCOUNT#${id}`,
        'sk': `ACCOUNT#${id}`,
      },
      ProjectionExpression: 'password'
    }).promise();

    if (isEmpty(account.Item)) {
      throw new BaselineError({
        statusCode: 404,
        message: `The account with id "${id}" does not exist.`
      });
    }

    return await bcrypt.compare(password, account.Item.password);
  } catch (e) {
    throw e;
  }
}

async function requestEmailChange(id, newEmail) {
  const validation = validator.validate({ id, email: newEmail }, pick(accountSchema, ['email', 'id']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  const changeEmailId = ulid();
  const oneDay = 60 * 60 * 24;
  const dateTime = (new Date).toISOString();
  const ttl = Math.round((new Date).getTime() / 1000) + oneDay;

  const account = await getAccount(id);

  const params = {
    TransactItems: [{
      'ConditionCheck': {
        'TableName': tableName,
        'Key': {
          'pk': `ACCOUNT#${id}`,
          'sk': `ACCOUNT#${id}`,
        },
        'ConditionExpression': 'attribute_exists(pk) AND attribute_exists(sk)'
      }
    }, {
      'ConditionCheck': {
        'TableName': tableName,
        'Key': {
          'pk': `EMAIL#${newEmail}`,
          'sk': `EMAIL#${newEmail}`,
        },
        'ConditionExpression': 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
      }
    }, {
      Put: {
        TableName: tableName,
        Item: {
          'pk': `CHANGEEMAILREQUEST#${changeEmailId}`,
          'sk': `CHANGEEMAILREQUEST#${changeEmailId}`,
          'accountId': id,
          'oldEmail': account.result.email,
          'newEmail': newEmail,
          'createdAt': dateTime,
          'updatedAt': dateTime,
          'ttl': ttl
        }
      }
    }]
  };

  try {
    await transactWrite(params);

    return new BaselineResponse({
      result: {
        hash: changeEmailId,
        account: account.result
      },
      statusCode: 201
    });
  } catch (e) {
    let message, statusCode, errors = [];

    switch (e.name) {
      case 'TransactionCanceledException':
        if (e.reasons && e.reasons[1].Code === 'ConditionalCheckFailed') {
          message = `Validation failed.`;
          errors.push({
            field: 'email',
            message: `The email "${newEmail}" already is in use.`
          })
          statusCode = 400;
        } else {
          message = `The account with id "${id}" does not exist.`;
          statusCode = 404;
        }
        break;
      default:
        message = `An error occured updating the account with id "${id}".`;
        statusCode = 500;
        break;
    }
    throw new BaselineError({
      statusCode,
      message,
      errors
    });
  }
}

async function updateEmailWithToken(token, _testNow) {
  const validation = validator.validate({ token }, pick(accountSchema, ['token']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const dateTime = (new Date).toISOString();
    const now = _testNow || Math.round((new Date).getTime() / 1000);

    const response = await docClient.get({
      TableName: tableName,
      Key: {
        'pk': `CHANGEEMAILREQUEST#${token}`,
        'sk': `CHANGEEMAILREQUEST#${token}`,
      }
    }).promise();

    if (!response.Item) {
      throw new BaselineError({
        statusCode: 404,
        message: 'You provided an invalid token to reset your email.'
      });
    }

    let items = [];
    // When a new account gets created, we use this flow for email verification as well.
    // In this case the oldEmail will be the same as the newEmail. When that happens,
    // DynamoDB would fail the transaction if we'd try and run two operations on one item.
    // We therefor exclude the item operation in that case.
    if (response.Item.oldEmail !== response.Item.newEmail) {
      items = [{
        Delete: {
          'TableName': tableName,
          'Key': {
            'pk': `EMAIL#${response.Item.oldEmail}`,
            'sk': `EMAIL#${response.Item.oldEmail}`,
          }
        }
      }, {
        Put: {
          'TableName': tableName,
          'Item': {
            'pk': `EMAIL#${response.Item.newEmail}`,
            'sk': `EMAIL#${response.Item.newEmail}`,
            'accountId': response.Item.accountId,
            'createdAt': dateTime,
            'updatedAt': dateTime
          },
          'ConditionExpression': 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
        }
      }]
    }

    const params = {
      TransactItems: [...items, {
        Delete: {
          'TableName': tableName,
          'Key': {
            'pk': `CHANGEEMAILREQUEST#${token}`,
            'sk': `CHANGEEMAILREQUEST#${token}`
          },
          'ConditionExpression': 'attribute_exists(pk) AND attribute_exists(sk) AND #ttl > :now',
          'ExpressionAttributeValues': {
            ':now': now
          },
          'ExpressionAttributeNames': {
            '#ttl': 'ttl'
          }
        }
      }, {
        Update: {
          TableName: tableName,
          Key: {
            'pk': `ACCOUNT#${response.Item.accountId}`,
            'sk': `ACCOUNT#${response.Item.accountId}`
          },
          UpdateExpression: 'set email = :e, validatedEmail = :v, updatedAt = :u',
          ExpressionAttributeValues: {
            ':e': response.Item.newEmail,
            ':u': dateTime,
            ':v': true
          },
          ReturnValues: 'ALL_NEW'
        }
      }]
    };

    await transactWrite(params);

    return new BaselineResponse({
      statusCode: 200
    });
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    let message, statusCode;
    switch (e.name) {
      case 'TransactionCanceledException':
        message = `We were not able to update the accounts email. The email is already in use.`;
        statusCode = 400;
        if (e.reasons[2] && e.reasons[2].Code === 'ConditionalCheckFailed') {
          message = 'The token to reset your email has expired.';
          statusCode = 401;
        }
        break;
      default:
        message = `An error occured updating the accounts email.`;
        statusCode = 500;
        break;
    }
    throw new BaselineError({
      statusCode,
      message
    });
  }
}

async function requestPasswordReset(email) {
  const validation = validator.validate({ email }, pick(accountSchema, ['email']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  const account = await getAccountByEmail(email);
  const changePasswordHash = ulid();
  const oneDay = 60 * 60 * 24;
  const dateTime = (new Date).toISOString();
  const ttl = Math.round((new Date).getTime() / 1000) + oneDay;

  const params = {
    TransactItems: [{
      'ConditionCheck': {
        'TableName': tableName,
        'Key': {
          'pk': `ACCOUNT#${account.result.id}`,
          'sk': `ACCOUNT#${account.result.id}`,
        },
        'ConditionExpression': 'attribute_exists(pk) AND attribute_exists(sk)'
      }
    }, {
      Put: {
        TableName: tableName,
        Item: {
          'pk': `CHANGEPASSWORDREQUEST#${changePasswordHash}`,
          'sk': `CHANGEPASSWORDREQUEST#${changePasswordHash}`,
          'accountId': account.result.id,
          'createdAt': dateTime,
          'updatedAt': dateTime,
          'ttl': ttl
        }
      }
    }]
  };

  try {
    const response = await docClient.transactWrite(params).promise();
    return new BaselineResponse({
      result: {
        hash: changePasswordHash,
        account: account.result
      },
      statusCode: 201
    });
  } catch (e) {
    let message, statusCode;
    switch (e.name) {
      case 'TransactionCanceledException':
        message = `The account with id "${id}" does not exist.`;
        statusCode = 404;
        break;
      default:
        message = `An error occured updating the account with id "${id}".`;
        statusCode = 500;
        break;
    }
    throw new BaselineError({
      statusCode,
      message
    });
  }
}

async function updatePasswordWithToken(token, newPassword, _testNow) {
  const validation = validator.validate({ token, password: newPassword }, pick(accountSchema, ['token', 'password']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const now = _testNow || Math.round((new Date).getTime() / 1000);

    const response = await docClient.get({
      TableName: tableName,
      Key: {
        'pk': `CHANGEPASSWORDREQUEST#${token}`,
        'sk': `CHANGEPASSWORDREQUEST#${token}`,
      }
    }).promise();

    if (!response.Item) {
      throw new BaselineError({
        statusCode: 404,
        message: 'You provided an invalid token to reset your password.'
      });
    }

    const params = {
      TransactItems: [{
        Delete: {
          'TableName': tableName,
          'Key': {
            'pk': `CHANGEPASSWORDREQUEST#${token}`,
            'sk': `CHANGEPASSWORDREQUEST#${token}`
          },
          'ConditionExpression': 'attribute_exists(pk) AND attribute_exists(sk) AND #ttl > :now',
          ExpressionAttributeValues: {
            ':now': now
          },
          ExpressionAttributeNames: {
            '#ttl': 'ttl'
          }
        }
      }, {
        Update: {
          TableName: tableName,
          Key: {
            'pk': `ACCOUNT#${response.Item.accountId}`,
            'sk': `ACCOUNT#${response.Item.accountId}`
          },
          UpdateExpression: 'set password = :p, updatedAt = :u',
          ExpressionAttributeValues: {
            ':p': await hashPassword(newPassword),
            ':u': (new Date).toISOString()
          },
          ReturnValues: 'ALL_NEW'
        }
      }]
    };

    const transaction = await docClient.transactWrite(params).promise();

    return new BaselineResponse({
      statusCode: 200
    });
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    let message, statusCode;
    switch (e.name) {
      case 'TransactionCanceledException':
        message = `The token you provided is not valid.`;
        statusCode = 401;
        break;
      default:
        message = `An error occured updating the password.`;
        statusCode = 500;
        break;
    }
    throw new BaselineError({
      statusCode,
      message
    });
  }
}

async function setupAccountPassword(token, password, _testNow) {
  const validation = validator.validate({ token, password }, pick(accountSchema, ['token', 'password']));
  if (validation !== true) throw new BaselineError(translateValidationErrors(validation));

  try {
    const now = _testNow || Math.round((new Date).getTime() / 1000);

    const response = await docClient.get({
      TableName: tableName,
      Key: {
        'pk': `SETUPACCOUNT#${token}`,
        'sk': `SETUPACCOUNT#${token}`,
      }
    }).promise();

    if (!response.Item) {
      throw new BaselineError({
        statusCode: 404,
        message: 'You provided an invalid token to setup your account.'
      });
    }

    const params = {
      TransactItems: [{
        Delete: {
          'TableName': tableName,
          'Key': {
            'pk': `SETUPACCOUNT#${token}`,
            'sk': `SETUPACCOUNT#${token}`
          },
          'ConditionExpression': 'attribute_exists(pk) AND attribute_exists(sk) AND #ttl > :now',
          ExpressionAttributeValues: {
            ':now': now
          },
          ExpressionAttributeNames: {
            '#ttl': 'ttl'
          }
        }
      }, {
        Update: {
          TableName: tableName,
          Key: {
            'pk': `ACCOUNT#${response.Item.accountId}`,
            'sk': `ACCOUNT#${response.Item.accountId}`
          },
          UpdateExpression: 'set #password = :p, #status = :s, #updatedAt = :u',
          ExpressionAttributeValues: {
            ':p': await hashPassword(password),
            ':u': (new Date).toISOString(),
            ':s': 'active'
          },
          ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            '#password': 'password'
          },
          ReturnValues: 'ALL_NEW'
        }
      }]
    };

    await transactWrite(params);

    return new BaselineResponse({
      statusCode: 200,
      result: {
        account: {
          id: response.Item.accountId
        }
      }
    });
  } catch (e) {
    if (e instanceof BaselineError) throw e;
    let message, statusCode;
    switch (e.name) {
      case 'TransactionCanceledException':
        message = `The token you provided is not valid.`;
        statusCode = 401;
        break;
      default:
        message = `An error occured updating the password.`;
        statusCode = 500;
        break;
    }
    throw new BaselineError({
      statusCode,
      message
    });
  }
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