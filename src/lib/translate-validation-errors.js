function translateValidationErrors(errors, mapping = {}) {
  return {
    statusCode: 400,
    message: 'Validation failed.',
    errors: errors.map((error) => {
      return {
        message: error.message,
        field: mapping[error.field] || error.field
      }
    })
  }
}

export {
  translateValidationErrors
}