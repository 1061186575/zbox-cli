// example.js
// 添加命令: zbox local add ./example.js
// 执行命令: zbox local hello --name Codex

function main(options) {
    console.log('hello', options.name);
}

module.exports = {
    // 必填: 命令执行入口。也可以直接 module.exports = main;
    main,

    // 可选: 自定义命令名称。默认使用文件名或目录名。
    cmdName: 'hello',

    // 可选: 命令说明，会展示在 zbox local --help 中。
    description: '输出一条问候语',

    // 可选: 指定入口函数名。未指定时默认读取 main。
    mainName: 'main',

    // 可选: 命令参数。每一项会注册为 --name [name] 形式。
    // --name 后面不传值时为 true，传值时为对应字符串。
    // 如果 name 写成 'no-name'，会注册为 --no-name:
    // 1. zbox local hello -> options { name: true }
    // 2. zbox local hello --no-name -> options { name: false }
    // 3. zbox local hello --no-name VV -> options { name: 'VV' }
    options: [
        {
            name: 'name',
            desc: '要问候的名字'
        },
    ]
};
