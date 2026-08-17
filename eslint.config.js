const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        files: ['src/**/*.js', 'bin/**/*.js', 'test/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                __dirname: 'readonly',
                __filename: 'readonly',
                Buffer: 'readonly',
                console: 'readonly',
                clearInterval: 'readonly',
                clearTimeout: 'readonly',
                module: 'readonly',
                process: 'readonly',
                require: 'readonly',
                setInterval: 'readonly',
                setTimeout: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', { caughtErrors: 'none' }],
        },
    },
];
