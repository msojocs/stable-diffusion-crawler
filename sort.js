const fs = require('fs')

const resultDir = 'task/stable+diffusion+quicksettings/result'

const resultList = fs.readdirSync(resultDir).filter(e => e.includes('page'))
console.log(resultList)
const list = []
for (const resultName of resultList) {
    const resultData = require(`./${resultDir}/${resultName}`)
    // console.log(resultData)
    const tokenList = resultData.map(e => ({
        url: e.url
    }))
    list.push(...tokenList)

}
list.sort((a, b ) => {
    if (a.url > b.url) return 1
    if (a.url < b.url) return -1
    return 0
})
const uniqueArray = Array.from(new Set(list.map((item) => item.url))).map(
    (url) => {
        return list.find((item) => item.url === url);
    }
);
const resultStr = uniqueArray.map(e => `${e.url}`).join('\n')
console.log(resultStr)
fs.writeFileSync(`result.txt`, resultStr)