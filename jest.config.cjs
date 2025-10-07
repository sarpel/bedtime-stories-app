module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { isolatedModules: true }],
  },
  moduleFileExtensions: ["js", "ts", "cjs", "mjs", "json"],
  testMatch: [
    "**/backend/__tests__/**/*.test.[jt]s",
    "**/backend/__tests__/**/*.test.cjs",
    "**/backend/__tests__/**/*.spec.[jt]s",
    "**/backend/__tests__/**/*.spec.cjs",
  ],
  verbose: true,
  forceExit: true,
  maxWorkers: 1,
};
