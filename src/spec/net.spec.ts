// Simple multiplatform functional test
if ((global as any).window != null) {
  throw new Error(`Can't run on browser.`)
}
const axios = require('axios')
import { retrying } from '../lib/net'
const http = require('http')

const PORT = 9589

const expect = (2 + Math.random() * 20) >> 0
let attempt = 0

http
  .createServer((_: any, res: any) => {
    if (++attempt >= expect) {
      res.writeHead(200)
    } else {
      res.writeHead(400)
    }
    res.end()
  })
  .listen(PORT)

retrying(axios.get(`http://localhost:${PORT}`))
  .then(() => {
    console.time('Request time')
    if (attempt > expect) {
      console.error(`Assertion failed: ${attempt} > ${expect}`)
      process.exit(1)
    }
    console.log(`All ok! attempts: ${attempt}`)
    console.timeEnd('Request time')
    process.exit(0)
  })
  .catch((e: any) => {
    console.error(e)
    process.exit(-1)
  })

export {}
