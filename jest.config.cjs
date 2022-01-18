module.exports = {
   preset: 'ts-jest',
   testEnvironment: 'node',

   collectCoverage: false,
   coverageDirectory: 'coverage',
   coverageProvider: 'v8',

   rootDir: 'src',

   //Needed for .js support in the imports
   extensionsToTreatAsEsm: ['.ts'],
   globals: {
      'ts-jest': {
         //compiler: 'ttypescript',
         useESM: true
      },
   },
   moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
   },
};
