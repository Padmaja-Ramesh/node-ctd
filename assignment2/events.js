const eventEmitter = require("events");
const emitter = new eventEmitter();
emitter.on("time", (message) => {
  console.log("Time received: ", message);
});

setInterval(() => {
  const currentTime = new Date().toLocaleTimeString();
  emitter.emit("time", currentTime);
}, 5000);

module.exports = emitter;
