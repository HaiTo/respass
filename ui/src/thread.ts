import {EventEmitter} from "events";
import {NewMessageEvent, CreateMessageEvent} from "../../common/events";
import {IMessage} from "../../common/data";

export
class Thread extends EventEmitter {
  connetion = new WebSocket("ws://localhost:8080");
  messages: IMessage[] = [];
  connection_number: number = 0

  constructor() {
    super();
    this.connetion.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.ev) {
        case "NEW_MESSAGE":
          const newMessage = message as NewMessageEvent;
          console.log("message received:", message);
          this.messages.push(message.value);
          this.emit("message");
          break;
        case "USER_JOIN":
        case "USER_LEAVE":
          const connection_number = message.value.connections
          this.connection_number = connection_number
          this.emit("connection_update")
          break;
        default:
          break;
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  newMessage(message: string) {
    const createMessage: CreateMessageEvent = {
      ev: "CREATE_MESSAGE",
      value: message
    };
    this.connetion.send(JSON.stringify(createMessage));
  }
}

export
const thread = new Thread();