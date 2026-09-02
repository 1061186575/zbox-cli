const {
    getCaptureTime,
    isMediaFile,
    parseConcurrency,
    repairMediaFileTime
} = require('../../src/file/repairMediaTime');

describe('repairMediaTime', () => {
    test('uses the highest priority capture time tag', () => {
        const originalDate = new Date('2024-03-15T06:30:00.000Z');
        const createDate = new Date('2024-03-16T06:30:00.000Z');
        const originalValue = { toDate: () => originalDate };

        expect(getCaptureTime({
            DateTimeOriginal: originalValue,
            CreateDate: { toDate: () => createDate }
        })).toEqual({
            date: originalDate,
            writeValue: originalValue,
            tagName: 'DateTimeOriginal'
        });
    });

    test('writes capture time to file create and modify dates', async () => {
        const captureDate = new Date('2024-03-15T06:30:00.000Z');
        const captureTime = { toDate: () => captureDate };
        const exiftool = {
            read: jest.fn().mockResolvedValue({ DateTimeOriginal: captureTime }),
            write: jest.fn().mockResolvedValue({})
        };

        const result = await repairMediaFileTime(exiftool, '/tmp/photo.jpg');

        expect(exiftool.write).toHaveBeenCalledWith('/tmp/photo.jpg', {
            FileCreateDate: captureTime,
            FileModifyDate: captureTime
        }, {
            writeArgs: ['-overwrite_original']
        });
        expect(result.status).toBe('success');
        expect(result.tagName).toBe('DateTimeOriginal');
    });

    test('skips media without capture time', async () => {
        const exiftool = {
            read: jest.fn().mockResolvedValue({}),
            write: jest.fn()
        };

        const result = await repairMediaFileTime(exiftool, '/tmp/photo.jpg');

        expect(result.status).toBe('skipped');
        expect(exiftool.write).not.toHaveBeenCalled();
    });

    test('recognizes media extensions case-insensitively', () => {
        expect(isMediaFile('/tmp/photo.HEIC')).toBe(true);
        expect(isMediaFile('/tmp/video.MP4')).toBe(true);
        expect(isMediaFile('/tmp/document.txt')).toBe(false);
    });

    test('validates concurrency', () => {
        expect(parseConcurrency('10')).toBe(10);
        expect(parseConcurrency('0')).toBe(0);
        expect(parseConcurrency('1.5')).toBe(0);
        expect(parseConcurrency('abc')).toBe(0);
    });
});
