import AWS from 'aws-sdk';
import { getTransactWrite } from './helper/transact-write';

const tableName = process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME;

AWS.config.update({ region: process.env.BASELINE_FIREPLACE_DYNAMODB_REGION });

if (process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT) {
  AWS.config.update({
    dynamodb: {
      endpoint: process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT
    }
  });
}

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const transactWrite = getTransactWrite(docClient);

export {
  docClient,
  transactWrite,
  tableName
}