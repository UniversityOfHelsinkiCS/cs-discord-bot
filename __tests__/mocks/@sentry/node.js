module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  withScope: (cb) => cb({ setTag: jest.fn(), setUser: jest.fn() }),
  setTag: jest.fn(),
  setUser: jest.fn(),
  expressErrorHandler: () => (req, res, next) => next(),
};
