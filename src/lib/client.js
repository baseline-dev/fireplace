import { config, DynamoDB } from 'aws-sdk';
import { getTransactWrite } from './transact-write';

const tableName = process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME;

config.update({ region: process.env.BASELINE_FIREPLACE_DYNAMODB_REGION });

if (process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT) {
  config.update({
    dynamodb: {
      endpoint: process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT
    }
  });
}

const docClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const transactWrite = getTransactWrite(docClient);

export {
  docClient,
  transactWrite,
  tableName
}