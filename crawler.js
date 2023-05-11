
const config = require('./config.json')

const https = require('https')
const http = require('http')
const fs = require('fs')

const target = 'stable+diffusion+quicksettings'
let cursor = ''
let page = 1;
const timeout = 30000
const continueTask = false

const censysStorageDir = `task/${target}/censys`
const resultStorageDir = `task/${target}/result`

const request = () => {
    return new Promise((resolve, reject) => {
        let data = ''
        const req = https.get(`https://search.censys.io/api/v2/hosts/search?per_page=100&virtual_hosts=EXCLUDE&q=${target}&cursor=${cursor}`, {
            auth: `${config.appId}:${config.secret}`,
            timeout
        }, (res) => {
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', () => {
                // console.log(data)
                resolve(JSON.parse(data))
            })
        })
    })
}

const HttpRequest = {
    HTTP: async (url) => {
        return new Promise((resolve, reject) => {
            let data = ''
            const req = http.get(url, {
                timeout
            }, (res) => {
                res.on('data', (chunk) => {
                    // console.log('chunk:', chunk.toString())
                    data += chunk
                })
                res.on('end', () => {
                    // console.log(data)
                    resolve(data)
                })
                res.on('error', (err) => {
                    reject(err)
                })
            })
            req.on('finish', () => {
                console.log('finish')
            })
            req.on('error', err => reject(err))
        })
    },
    HTTPS: async (url) => {
        return new Promise((resolve, reject) => {
            let data = ''
            const req = https.get(url, {
                rejectUnauthorized: false,
                timeout,
            }, (res) => {
                res.on('data', (chunk) => {
                    // console.log('chunk:', chunk.toString())
                    data += chunk
                })
                res.on('end', () => {
                    // console.log(data)
                    resolve(data)
                })
                res.on('error', (err) => {
                    reject(err)
                })
            })
            req.on('finish', () => {
                console.log('finish')
            })
            req.on('error', err => reject(err))
        })
    },
}

// 函数实现，参数单位 毫秒 ；
function wait(ms) {
    return new Promise(resolve =>setTimeout(() =>resolve(), ms));
};

(async () => {
    // 先抓取censys搜索结果
    console.log('start')
    let crawler = true
    try {
        fs.mkdirSync(censysStorageDir, {
            recursive: true
        })
    } catch (error) {
        
    }
    if (fs.existsSync(`${censysStorageDir}/progress.json`)) {
        const progress = require(`./${censysStorageDir}/progress.json`)
        cursor = progress.cursor
        page = progress.page
        crawler = cursor && cursor.length > 0
    }

    while(crawler) {
        const resp = await request()
        
        const { next } = resp.result.links
        // console.log('resp:', resp)
        if (resp.code != 200) {
            console.error('寄！', resp)
            return
        }
        fs.writeFileSync(`${censysStorageDir}/page_${page}.json`, JSON.stringify(resp, null, 4))
        
        cursor = next
        page++;
        fs.writeFileSync(`${censysStorageDir}/progress.json`, JSON.stringify({
            cursor,
            page
        }, null, 4))

        // break
        if (!next) break
    }

    // 再处理数据
    const dir = fs.readdirSync(censysStorageDir)
    const pageList = dir.filter(e=>e.startsWith('page_'))
    let progress = {}
    const progressLoc = `./${resultStorageDir}/progress.json`
    
    // 多线程，serverIndex是各自拥有
    if (continueTask && fs.existsSync(progressLoc)) {
        const p = require(progressLoc)
        progress = {
            ...progress,
            ...p
        }
    }
    const doPageTask = async (i, page, serverIndex, result) => {

        const resp = require(`./${censysStorageDir}/${page}`)
            
        const { hits: list } = resp.result
        for(let j = serverIndex; j < list.length; j++) {
            const host = list[j]
            console.log('pageIndex:', i, 'page:', page,'serverIndex:', j)
            const { ip, services } = host
            const httpServices = services.filter(e=>e.service_name === 'HTTP')
            for(const service of httpServices) {
                let newData = null
                try {
                    const url = `${service.extended_service_name}://${ip}:${service.port}`
                    console.log('处理：', url)
                    const html = await HttpRequest[service.extended_service_name](url)
                    // await wait(500);
                    if (!html.includes('Stable') || !html.includes('Diffusion') || !html.includes('quicksettings')) {
                        console.warn('不包含quicksettings，跳过')
                        continue
                    }
                    newData = {
                        url,
                    }
                    // const m = html.match(/sk-(.*?)['|"]/)
                    // if (m == null){
                    //     console.log('匹配失败', html)
                    // }

                    // 调用方法；
                    await wait(500);
                }catch(err) {
                    console.error(`${service.extended_service_name}://${ip}:${service.port}error:`, err)
                }finally{
                    if (newData !== null)
                        result.push(newData)
                }
            }
            console.log('保存...')
            try {
                fs.mkdirSync(resultStorageDir, { recursive: true })
            }catch(err) {

            }
            fs.writeFileSync(`${resultStorageDir}/result_${page}`, JSON.stringify(result, null, 4))
            progress[page] = j + 1;
            fs.writeFileSync(progressLoc, JSON.stringify(progress, null, 4))
        }
    }
    for (let i = 0; i < pageList.length; i++) {
        const page = pageList[i]
        const result = []
        const resultLoc = `./${resultStorageDir}/result_${page}`
        if (continueTask && fs.existsSync(resultLoc)) {
            result.push(...require(resultLoc))
        }

        doPageTask(i, page, progress[page] || 0, result)
    }
})()
// console.log('req', req)
console.log('crawler')