const {
    compareVersions,
    getMinimumNodeVersion,
    getNodeVersionWarning,
    warnIfUnsupportedNodeVersion
} = require('../src/utils/nodeVersion');

describe('Node version warning', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should compare semantic versions', () => {
        expect(compareVersions('20.0.0', '20.0.0')).toBe(0);
        expect(compareVersions('20.1.0', '20.0.9')).toBe(1);
        expect(compareVersions('18.19.0', '20.0.0')).toBe(-1);
        expect(compareVersions('v20.0.0', '20')).toBe(0);
    });

    test('should read minimum version from package engines range', () => {
        expect(getMinimumNodeVersion('>=20.0.0')).toBe('20.0.0');
        expect(getMinimumNodeVersion('>=18 <23')).toBe('18.0.0');
        expect(getMinimumNodeVersion('^20.1')).toBe('20.1.0');
        expect(getMinimumNodeVersion('>=20.0.0 || >=18.19.0')).toBe('18.19.0');
    });

    test('should warn when current node is lower than engines node range', () => {
        const warning = getNodeVersionWarning('18.19.0', '>=20.0.0');

        expect(warning).toBe('[zbox] 当前 Node.js 版本 v18.19.0 低于 package.json 要求 (>=20.0.0)，建议升级 Node.js 后再运行。');
    });

    test('should not warn when current node meets engines node range', () => {
        expect(getNodeVersionWarning('20.0.0', '>=20.0.0')).toBeNull();
        expect(getNodeVersionWarning('21.1.0', '>=20.0.0')).toBeNull();
    });

    test('should print warning to stderr through console.warn', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        warnIfUnsupportedNodeVersion('18.19.0', '>=20.0.0');

        expect(warnSpy).toHaveBeenCalledWith('[zbox] 当前 Node.js 版本 v18.19.0 低于 package.json 要求 (>=20.0.0)，建议升级 Node.js 后再运行。');
    });
});
