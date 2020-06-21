function getTransactWrite(docClient) {
  return function transactWrite(params) {
    const transactionRequest = docClient.transactWrite(params);
    let cancellationReasons;
    transactionRequest.on('extractError', (response) => {
      try {
        cancellationReasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;
      } catch (err) {
        // suppress this just in case some types of errors aren't JSON parseable
        console.error('Error extracting cancellation error', err);
      }
    });
    return new Promise((resolve, reject) => {
      transactionRequest.send((err, response) => {
        if (err) {
          err.reasons = cancellationReasons;
          return reject(err);
        }
        return resolve(response);
      });
    });
  }
}

export {
  getTransactWrite
}