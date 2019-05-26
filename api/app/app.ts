import { GameLobby } from './models/GameLobby';
import * as express from 'express';
import * as socketio from 'socket.io';
import * as path from 'path';
import * as http from 'http';
import { Player } from './models/Player';
import { PlayerRoles } from './models/PlayerRoles';

const app: express.Application = express();

app.set("port", process.env.PORT || 3001);

const appServer = http.createServer(app);
// set up socket.io and bind it to our
// http server.
const io: socketio.Server = socketio(appServer);

// Active game lobbies
let gameLobbies: GameLobby[] = [];


// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.sockets.on('connection', (socket: socketio.Socket) => {
  console.log("a user connected");
  addEventListenersToSocket(socket);
});

const server: http.Server = appServer.listen(app.get('port'), () => {
  console.log('listening on *:' + app.get('port'));
});






function addEventListenersToSocket(socket: socketio.Socket) {

  // Attempting to join a lobby
  socket.on('joinLobby', (lobbyName: string) => {
    if (!lobbyName) {
      console.log('Could not join lobby');
    }

    const gameLobby: GameLobby = getOrCreateGameLobby(lobbyName);

    // If the lobby has no players, make the player an Artist
    const playerRole: PlayerRoles = gameLobby.hasPlayers()
      ? PlayerRoles.Guesser
      : PlayerRoles.Artist;

    const playerName: string = 'Player' + (gameLobby.getPlayers().length) + 1;

    // Temp name
    const player: Player = new Player(socket.id, playerRole, playerName);

    // If the player was successfully added to the lobby
    if (gameLobby.addPlayer(player)) {

      // Join the game lobby
      socket.join(lobbyName);

      // Send the playerRole to the client
      socket.emit('wasAddedToGame', {
        name: playerName,
        role: playerRole
      });

      // Log the event
      console.log('User', player.name, 'joined lobby:', lobbyName);

      // -- Additional events -- //

      // Canvas events
      socket.on('event', (event: string) => {
        console.log(event);

        // Emit event to all other members of the lobby
        socket.to(lobbyName).emit('event', event);
      });

      // When the player disconnects, remove them from the lobby
      socket.on('disconnect', () => {

        // Remove the player from the game lobby
        gameLobby.removePlayer(socket.id);

        // Log the event
        console.log('User disconnected - ', player.name);

        if (!gameLobby.hasPlayers()) {
          // If no players are left, remove the lobby
          removeLobbyFromGameLobbies(gameLobby);
        } else {
          // Else, check if an Artist is now missing
          checkForMissingArtist(gameLobby);
        }

      });

    } else {
      console.log('Could not join lobby');
    }
  });
}

function getOrCreateGameLobby(lobbyName: string): GameLobby {
  // Check for any existing lobbies
  let lobby: GameLobby | undefined = getGameLobbyByName(lobbyName);

  // If non were found, create a new one
  if (!lobby) {
    lobby = new GameLobby(lobbyName);
    gameLobbies.push(lobby);
  }

  return lobby;
}

const getGameLobbyByName = (lobbyName: string): GameLobby | undefined => gameLobbies.find(
  (lobby: GameLobby): boolean => lobby.roomName === lobbyName
);

function removeLobbyFromGameLobbies(gameLobby: GameLobby): boolean {
  try {
    gameLobbies = gameLobbies.filter((lobby): boolean => lobby !== gameLobby);
    console.log('Removed lobby - ', gameLobby.roomName);
    return true;
  } catch (error) {
    return false;
  }
}

function checkForMissingArtist(gameLobby: GameLobby) {

  // If no artistPlayer was found
  if (gameLobby.hasPlayers() && !gameLobby.getArtistPlayer()) {
    // Set the first player remaining to be the Artist
    const player: Player = gameLobby.getPlayers()[0];
    player.role = PlayerRoles.Artist;
    io.to(player.id).emit('newRole', PlayerRoles.Artist);
  }
}


// app.get("/", (req: any, res: any) => {
//   console.log('Sent file');
//   res.sendFile(path.resolve("./client/index.html"));
// });
