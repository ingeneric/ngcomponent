export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                isolatedModules: true,
            },
        ],
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    roots: ['<rootDir>/src/'],
};
