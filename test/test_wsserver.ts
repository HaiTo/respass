import {app, server} from "../server/app"
import * as WebSocket from "ws"
import * as assert from "power-assert"

import "../server/wsserver"

describe("wsserver", () => {

  let ws1: WebSocket
  let ws2: WebSocket
  beforeEach(() => {
    let port = server.address().port
    ws1 = new WebSocket(`ws://127.0.0.1:${port}/`, {
      headers: { "Sec-WebSocket-Accept": "1" }
    })
    ws2 = new WebSocket(`ws://127.0.0.1:${port}/`, {
      headers: { "Sec-WebSocket-Accept": "2" }
    })
  })
  it("enables to connect", (done) => {
    ws1.on('open', () => {
      done()
    })
  })
  it("enables to disconnect", (done) => {
    ws1.on('open', () => {
      ws1.close()
    })
    ws1.on('close', (data) => {
      done()
    })
  })
  it("closes automatically when pong event is not received", function (done)  {
    this.timeout(10 * 1000)
    ws1.on('open', () => {
    })
    ws1.on('close', (data) => {
      done()
    })
  })
  it("can create messages up to 100 per hour", function (done)  {
    this.timeout(10 * 1000)
    let messageCount = 0
    ws1.on('open', () => {
      for (let i=0; i<200; i++) {
        ws1.send(JSON.stringify({
          "ev": "CREATE_MESSAGE",
          "value": "sample message"
        }))
      }
      ws1.close()
    })
    ws1.on('message', (data) => {
      const {ev, value} = JSON.parse(data)
      switch(ev) {
        case "PING":
          const pong = {
            "ev": "PONG",
            "value": value
          }
          try {
            ws1.send(JSON.stringify(pong))
          } catch(e) {
            // nothing to do
          }
          break
        case "NEW_MESSAGE":
          messageCount++
          break
      }
    })
    ws1.on('close', (data) => {
      assert.equal(messageCount, 100)
      done()
    })
  })
  it("did not close connection when ping event is successfully received", function (done)  {
    this.timeout(20 * 1000)
    let ping_times = 0
    let success = false

    ws1.on('message', (data) => {
      const {ev, value} = JSON.parse(data)
      switch(ev) {
        case "PING":
          const pong = {
            "ev": "PONG",
            "value": value
          }
          try {
            ws1.send(JSON.stringify(pong))
          } catch(e) {
            // nothing to do
          }
          ping_times++
          break
      }
      if (ping_times > 1) {
        success = true
        ws1.close()
      }
    })
    ws1.on('close', () => {
      assert.equal(success, true); done()
    })
  })
  it("must emit join event if user joins", function (done)  {
    let success = false
    ws1.on('message', (data) => {
      const {ev, value} = JSON.parse(data)
      if (ev === "USER_JOIN") {
        success = true
        ws1.close()
      }
    })
    ws1.on('close', () => {
      assert.equal(success, true); done()
    })
  })
  it("must emit left event if user leaves", function (done)  {
    this.timeout(20 * 1000)
    let success = false
    ws2.on('open', () => {
      ws1.close()
    })
    ws2.on('message', (data) => {
      const {ev, value} = JSON.parse(data)
      if (ev === "PING") {
        const pong = {
          "ev": "PONG",
          "value": value
        }
        try {
          ws2.send(JSON.stringify(pong))
        } catch(e) {
          // nothing to do
        }
      }
      if (ev === "USER_LEAVE") {
        success = true
        ws2.close()
      }
    })
    ws2.on('close', () => {
      assert.equal(success, true); done()
    })
  })
})
