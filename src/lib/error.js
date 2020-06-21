import Validator from 'fastest-validator';

const validator = new Validator();
const schema = {
  statusCode: {type: 'number', default: 500},
  message: {type: 'string', default: 'An unknown error occured.'},
  errors: {type: 'array', default: []}
};

class BaselineError extends Error {
  constructor(error = {}) {
    super(error);

    error.message = error.message || 'Internal server error';
    error.statusCode = error.statusCode || 500;
    error.errors = error.errors || [];

    const isValid = validator.validate(error, schema);
    if (isValid !== true) throw isValid;

    this.message = error.message;
    this.statusCode = error.statusCode;
    this.errors = error.errors;
  }

  get name() {
    return 'BaselineError'
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      status: 'error',
      message: this.message,
      errors: this.errors
    }
  }
}

export {
  BaselineError
}