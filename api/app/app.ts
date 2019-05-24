import * as express from 'express';
import * as socketio from 'socket.io';
import * as path from 'path';
import * as http from 'http';

const app: express.Application = express();

app.set("port", process.env.PORT || 3001);

const appServer = http.createServer(app);
// set up socket.io and bind it to our
// http server.
const io: socketio.Server = socketio(appServer);

console.log('Woop');

// app.get("/", (req: any, res: any) => {
//   console.log('Sent file');
//   res.sendFile(path.resolve("./client/index.html"));
// });

// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.sockets.on('connection', function (socket: socketio.Socket) {
  console.log("a user connected");

  // whenever we receive a 'message' we log it out
  socket.on("event", (event: string) => {
    console.log(event);
    io.emit('event', event);
  });
});

const server = appServer.listen(app.get('port'), function () {
  console.log('listening on *:' + app.get('port'));
});
