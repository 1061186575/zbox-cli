const { program } = require('commander');

const ke = program.command('ke');

ke
    .command('url')
    .description('通过 url 找到对应的 api 代码')
    .option('-u, --url <url>', '指定目标分支')
    .action(options => {
        require('./url2ApiCode')(options.url);
    });
