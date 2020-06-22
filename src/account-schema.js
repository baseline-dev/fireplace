export default {
  id: {
    type: 'string', messages: {
      required: 'Please provide the account id.',
      string: 'Please provide a valid account id.',
    }
  },
  email: {
    type: 'email', messages: {
      required: 'Please provide a valid email.',
      email: 'Please provide a valid email.',
      string: 'Please provide a valid email.',
    }
  },
  password: {
    type: 'string', min: 7, messages: {
      required: 'Please provide a password.',
      stringMin: 'Your password should be at least 7 characters long.'
    }
  },
  fullName: {
    type: 'string', empty: false, messages: {
      stringEmpty: 'Please provide your full name.',
      required: 'Please provide your name.',
    }
  },
  billing: {
    type: 'object', default: {
      customer: {},
      subscription: {}
    }
  },
  token: {
    type: 'string', messages: {
      required: 'Please provide the token.',
      string: 'Please provide a valid token.',
    }
  },
  scope: {
    type: 'array',
    items: 'string', enum: ['user', 'admin'],
    messages: {
      required: 'Please provide the account scope.',
      string: 'Please provide a valid account scope.',
    }
  },
  status: {
    type: 'array',
    items: 'string', enum: ['setup', 'active'],
    messages: {
      required: 'Please provide the account status.',
      string: 'Please provide a valid account status.',
    }
  }
};