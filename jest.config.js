module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\.spec\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/modules/**/*.(t|j)s", "!**/node_modules/**"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@modules/(.*)$": "<rootDir>/modules/$1",
    "^@common/(.*)$": "<rootDir>/common/$1",
  },
};
