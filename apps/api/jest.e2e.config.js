const base = require('./jest.config');

// 실제 Postgres·Redis가 필요한 통합 테스트. 단위 테스트(npm test)와 분리해서 돌린다.
module.exports = {
  ...base,
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 60000,
};
