// ESM으로만 배포되는 의존성. Jest는 기본적으로 node_modules를 변환하지 않아
// `export` 구문에서 멈추므로, 이 패키지들만 ts-jest로 CommonJS 변환한다.
const esmOnlyPackages = ['@nestjs/bull', '@nestjs/bull-shared', '@nestjs/schedule'];

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [`/node_modules/(?!(${esmOnlyPackages.join('|')})/)`],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
