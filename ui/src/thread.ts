import {EventEmitter} from "events";
import {NewMessageEvent, CreateMessageEvent} from "../../common/events";
import {IMessage, IUser} from "../../common/data";
import {API_SERVER} from "./config";
const ReconnectingWebSocket: typeof WebSocket = require("ReconnectingWebSocket");

const WS_URL = API_SERVER.indexOf("https") === 0
  ? API_SERVER.replace("https", "wss")
  : API_SERVER.replace("http", "ws")

const PER_PAGE = 10

export
class Thread extends EventEmitter {
  connetion = new ReconnectingWebSocket(WS_URL);
  messages: IMessage[] = [];
  latestMessage: IMessage = null;
  connectionCount = 0;
  availableUsers: IUser[] = [];
  currentUser: IUser = null;
  hasOlderMessages = true

  constructor() {
    super();
    this.connetion.onopen = () => {
      this.fetchLatestMessages();
    };
    this.connetion.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.ev) {
        case "WHOAMI":
          this.currentUser = message.value;
          break;
        case "NEW_MESSAGE":
          const newMessage = message as NewMessageEvent;
          this.messages.push(message.value);
          this.latestMessage = message.value;
          this.emit("messageAppend");
          break;
        case "USER_JOIN":
        case "USER_LEAVE":
          const connectionCount = message.value.connections
          this.connectionCount = connectionCount
          this.fetchAvailableUsers()
          break;
        case "PING":
          const pingId: number = message.value
          this.pong(pingId)
        default:
          break;
        }
      } catch (error) {
        console.error(error);
      }
    };
  }

  async fetchAvailableUsers() {
    const response = await fetch(`${API_SERVER}/connections`);
    const availableUsers: IUser[] = await response.json();
    this.availableUsers = availableUsers;
    this.emit("connectionUpdate");
  }

  async fetchLatestMessages() {
    const response = await fetch(`${API_SERVER}/messages?limit=${PER_PAGE}`);
    const messages: IMessage[] = await response.json();
    this.messages = messages;
    this.latestMessage = null;
    this.emit("messageAppend");
  }

  async fetchOlderMessages() {
    if (this.messages.length == 0) {
      return
    }
    const lastId = this.messages[0].id
    const response = await fetch(`${API_SERVER}/messages?limit=${PER_PAGE}&nextId=${lastId}`);
    const messages: IMessage[] = await response.json();
    if (messages.length == 0) {
      this.hasOlderMessages = false
    } else {
      this.messages.unshift(...messages)
      this.latestMessage = null
      this.emit("messagePrepend")
    }
  }

  newMessage(message: string) {
    const createMessage: CreateMessageEvent = {
      ev: "CREATE_MESSAGE",
      value: message
    };
    this.connetion.send(JSON.stringify(createMessage));
  }

  pong(pingId: number) {
    const pongMessage = {
      ev: "PONG",
      value: pingId
    }
    this.connetion.send(JSON.stringify(pongMessage))
  }
}

export
const thread = new Thread();
