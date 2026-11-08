export function createRequestLogger(requestLogs) {
  return async (req, res, next) => {
    try {
      await requestLogs.create({
        timestamp: new Date(),
        method: req.method,
        path: req.path,
      });
    } catch (error) {
      console.error('Falha ao registrar requisição:', error);
    }

    next();
  };
}
