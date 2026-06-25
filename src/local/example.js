// example.js
// 添加命令: zbox local add ./example.js
// 执行命令: zbox local hello --name Codex

function main(options) {
    console.log('hello', options);
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

    // 可选: 命令参数。默认会注册为 --name [name] 形式。
    // 如果 required 为 true，会注册为 --name <name> 形式，输入 --name 后必须带值。
    // 如果 name 写成 'no-name'，会注册为 --no-name
    // 如果 name 是 '-' 开头的，就不会自动添加前缀。
    options: [
        {
            name: 'name',
            desc: '可选名称'
        },
        {
            name: 'token',
            desc: '必填 token',
            required: true
        },
        {
            name: 'no-cache',
            desc: '禁用缓存'
        },
        {
            name: '-l, --list',
            desc: '短选项，多个参数',
            multiple: true
        }
    ]
};
