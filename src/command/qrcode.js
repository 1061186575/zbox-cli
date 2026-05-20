const QRCode = require('qrcode');
const { question, multilineQuestion } = require('../utils');

async function main(options = {}) {
    let text = options.text;
    if (!text && options.multiline) {
        text = await multilineQuestion('请输入二维码内容');
    } else if (!text) {
        text = (await question('请输入二维码内容: ')).trim();
    }

    const output = options.output;

    if (!text) {
        console.error('二维码内容不能为空');
        return;
    }

    if (output) {
        await QRCode.toFile(output, text, {
            errorCorrectionLevel: 'M'
        });
        console.log(`二维码已保存到: ${output}`);
        return output;
    }

    const qrcode = await QRCode.toString(text, {
        type: 'terminal',
        small: true,
        errorCorrectionLevel: 'M'
    });

    console.log();
    console.log(qrcode);
    return qrcode;
}

module.exports = main;
