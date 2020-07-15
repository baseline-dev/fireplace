import { config, DynamoDB } from 'aws-sdk';
import { getTransactWrite as getWrite } from './transact-write';


let docClient;
function getDocClient() {
  if (docClient) return docClient;

  if (!process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME) {
    throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_TABLENAME'.`);
  }
  
  if (!process.env.BASELINE_FIREPLACE_DYNAMODB_REGION) {
    throw new Error(`Please configure the environment variable 'BASELINE_FIREPLACE_DYNAMODB_REGION'.`);
  }

  if (process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT) {
    config.update({
      dynamodb: {
        endpoint: process.env.BASELINE_FIREPLACE_DYNAMODB_ENDPOINT
      }
    });
  }

  config.update({ region: process.env.BASELINE_FIREPLACE_DYNAMODB_REGION });

  return docClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
}

function getTableName() {
  return process.env.BASELINE_FIREPLACE_DYNAMODB_TABLENAME;
}

function getTransactWrite() {
  return getWrite(getDocClient());
}

export {
  getDocClient,
  getTransactWrite,
  getTableName
}