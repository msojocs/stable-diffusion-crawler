
const now = new Date()
const nowStr = `${now.getFullYear()}-${(now.getMonth() + 1 + '').padStart(2, '0')}-${(now.getDate() + '').padStart(2, '0')}`
const old = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000)
const oldStr = `${old.getFullYear()}-${(old.getMonth() + 1 + '').padStart(2, '0')}-${(old.getDate() + '').padStart(2, '0')}`
console.log(nowStr, ' -> ', oldStr)