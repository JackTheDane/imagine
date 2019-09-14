import { ClientPlayer } from './models/interfaces/ClientPlayer';
import { GameLobby } from './models/classes/GameLobby';
import * as express from 'express';
import * as socketio from 'socket.io';
import * as http from 'http';
import { Player } from './models/classes/Player';

// Active game lobbies
let gameLobbies: GameLobby[] = [];

// ---- Server setup ---- //

const app: express.Application = express(); // Start Express
app.set("port", process.env.PORT || 3001); // Set port
const appServer = http.createServer(app); // Create server


// ---- Socket.IO setup ---- //

const io: socketio.Server = socketio(appServer); // Run IO server

// Listen for WebSocket connections
io.sockets.on('connection', (socket: socketio.Socket) => {
  console.log("a user connected"); // Log user connection

  addEventListenersToSocket(socket); // Add Socket event listeners
});

const server: http.Server = appServer.listen(app.get('port'), () => {
  console.log('listening on *:' + app.get('port'));
});

// ---- Utilities ---- //

function addEventListenersToSocket(socket: socketio.Socket) {

  // Attempting to join a lobby
  socket.on('joinLobby', (lobbyName: string, playerName: string, returnPlayerInfo: (player: ClientPlayer, otherPlayers: ClientPlayer[]) => void) => {
    if (!lobbyName) {
      console.log('Could not join lobby');
    }

    const gameLobby: GameLobby = getOrCreateGameLobby(lobbyName);
    const otherPlayers: Player[] = gameLobby.getPlayers().filter(p => p.id !== socket.id);
    const player: Player | false = gameLobby.addPlayer(socket, playerName);

    // If the player was successfully added to the lobby
    if (player) {

      // Return the player info to the player
      returnPlayerInfo({
        guid: player.guid,
        name: player.name,
        role: player.role,
        score: 0
      }, otherPlayers.map((p: Player): ClientPlayer => ({
        guid: p.guid,
        name: p.name,
        role: p.role,
        score: p.getScore()
      })));

      // ---- Disconnect event ---- //

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
          // Getting the artist player either gets or sets an artist player
          gameLobby.getArtistPlayer();
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
    lobby = new GameLobby(lobbyName, io);
    gameLobbies.push(lobby);
  }

  return lobby;
}

const getGameLobbyByName = (lobbyName: string): GameLobby | undefined => gameLobbies.find(
  (lobby: GameLobby): boolean => lobby.roomName === lobbyName
);

function removeLobbyFromGameLobbies(gameLobby: GameLobby): boolean {
  try {
    const oldGameLobbyLength: number = gameLobbies.length;
    gameLobbies = gameLobbies.filter((lobby): boolean => lobby !== gameLobby);
    console.log('Removed lobby - ', gameLobby.roomName);
    return oldGameLobbyLength > gameLobbies.length;
  } catch (error) {
    return false;
  }
}
