import AWS from 'aws-sdk';
import {getTransactWrite} from './helper/transact-write';

if (!process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME) {
  throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_TABLENAME'.`);
}

if (!process.env.BASELINE_FIREPLACE_DYNAMODB_REGION) {
  throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_REGION'.`);
}

if (!process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT) {
  throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_ENDPOINT'.`);
}

const tableName = process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME;

AWS.config.update({region: process.env.BASELINE_FIREPLACE_DYNAMODB_REGION});
AWS.config.update({
  dynamodb: {
    endpoint: process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT
  }
}); 

const docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const transactWrite = getTransactWrite(docClient);

export {
  docClient,
  transactWrite,
  tableName
}