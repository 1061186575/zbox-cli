function parseVersion(version) {
    if (!version || typeof version !== 'string') {
        return null;
    }

    const matched = version.match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!matched) {
        return null;
    }

    return [
        Number(matched[1]),
        Number(matched[2] || 0),
        Number(matched[3] || 0)
    ];
}

function compareVersions(leftVersion, rightVersion) {
    const left = parseVersion(leftVersion);
    const right = parseVersion(rightVersion);

    if (!left || !right) {
        return 0;
    }

    for (let index = 0; index < 3; index++) {
        if (left[index] > right[index]) {
            return 1;
        }

        if (left[index] < right[index]) {
            return -1;
        }
    }

    return 0;
}

function normalizeVersion(version) {
    const parsed = parseVersion(version);
    if (!parsed) {
        return null;
    }

    return parsed.join('.');
}

function getMinimumNodeVersion(requiredRange) {
    if (!requiredRange || typeof requiredRange !== 'string') {
        return null;
    }

    const versions = requiredRange
        .split('||')
        .map(range => range.match(/(?:>=|>|=|\^|~)?\s*v?(\d+(?:\.(?:\d+|x|\*)){0,2})/i))
        .filter(Boolean)
        .map(match => normalizeVersion(match[1]));

    if (!versions.length) {
        return null;
    }

    return versions.reduce((minimum, version) => {
        if (!minimum) {
            return version;
        }

        return compareVersions(version, minimum) < 0 ? version : minimum;
    }, null);
}

function getNodeVersionWarning(currentVersion, requiredRange) {
    const minimumVersion = getMinimumNodeVersion(requiredRange);
    if (!minimumVersion || compareVersions(currentVersion, minimumVersion) >= 0) {
        return null;
    }

    return `[zbox] 当前 Node.js 版本 v${currentVersion} 低于 package.json 要求 (${requiredRange})，建议升级 Node.js 后再运行。`;
}

function warnIfUnsupportedNodeVersion(currentVersion, requiredRange) {
    const warning = getNodeVersionWarning(currentVersion, requiredRange);
    if (warning) {
        console.warn(warning);
    }

    return warning;
}

module.exports = {
    parseVersion,
    compareVersions,
    getMinimumNodeVersion,
    getNodeVersionWarning,
    warnIfUnsupportedNodeVersion
};
