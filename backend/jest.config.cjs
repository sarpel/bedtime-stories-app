module.exports = {
    testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.test.cjs"],
    testEnvironment: 'node',
    verbose: false,
    collectCoverage: false,
    moduleFileExtensions: ['js', 'cjs', 'json'],
    roots: ['<rootDir>/tests']
};
