const readline = require("readline");

function question(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise(resolve => {
        rl.question(query, (str) => {
            resolve(str)
            rl.close();
        })
    })
}


module.exports = {
    question
}
