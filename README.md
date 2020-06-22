# Getting started

```
npm install @baseline-dev/fireplace
```

## Configuration

Make sure you set the following environment variables:

| Environment variable                   | Required | Example     |
|----------------------------------------|----------|-------------|
| BASELINE_FIREPLACE_DYNAMODB_TABLENAME  | yes      | Baseline    |
| BASELINE_FIREPLACE_DYNAMODB_REGION     | yes      | us-east-1   |
| BASELINE_FIREPLACE_DYNAMODB_ENDPOINT   | no       | localhost   |

# Api methods

Fireplace exports the following methods for you.

| Method name               |   
|---------------------------|
| getAccount                |
| getAccountByEmail         |
| createAccount             |
| deleteAccount             |
| updateAccount             |
| updatePassword            |
| isValidPassword           |
| requestEmailChange        |
| updateEmailWithToken      |
| requestPasswordReset      |
| updatePasswordWithToken   |
| setupAccountPassword      |

# DynamoDB partition and sort keys.

The following partition and sort key schema is used.

| pk                           | sk                           |
|------------------------------|------------------------------|
| #ACCOUNT{USERID}             | #ACCOUNT{USERID}             |
| #EMAIL{EMAIL}                | #EMAIL{EMAIL}                |
| #CHANGEEMAILREQUEST{HASH}    | #CHANGEEMAILREQUEST{HASH}    |
| #CHANGEPASSWORDREQUEST{HASH} | #CHANGEPASSWORDREQUEST{HASH} |

