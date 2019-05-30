import { ClientPlayer } from './models/interfaces/ClientPlayer';
import { Subject } from './models/interfaces/Subject';
import { GameLobby } from './models/classes/GameLobby';
import * as express from 'express';
import * as socketio from 'socket.io';
import * as path from 'path';
import * as http from 'http';
import { Player } from './models/classes/Player';
import { PlayerRoles } from './models/enums/PlayerRoles';
import { subjects } from './config/subjects';

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


// ---- Functions ---- //

function getRandomSubjects(numberToGet: number, excludedSubjects: string[] = []): Subject[] {

  // Filter the Subjects
  const filteredSubjects: Subject[] = subjects.filter(
    (subject: Subject): boolean => !excludedSubjects.includes(subject.text)
  );

  console.log(filteredSubjects);

  if (filteredSubjects.length < numberToGet) {
    return filteredSubjects;
  }

  const returnArray: Subject[] = [];

  for (let i = 0; i < numberToGet; i++) {
    const subjectIndex: number = Math.floor(Math.random() * (filteredSubjects.length - 1));
    const newSubject: Subject = filteredSubjects.splice(subjectIndex, 1)[0];
    returnArray.push(newSubject);
  }

  console.log(returnArray);

  return returnArray;
}

function addEventListenersToSocket(socket: socketio.Socket) {

  // Attempting to join a lobby
  socket.on('joinLobby', (lobbyName: string, returnPlayerInfo: (player: ClientPlayer, otherPlayers: ClientPlayer[]) => void) => {
    if (!lobbyName) {
      console.log('Could not join lobby');
    }

    const gameLobby: GameLobby = getOrCreateGameLobby(lobbyName);

    // If the lobby has no players, make the player an Artist
    const playerRole: PlayerRoles = gameLobby.hasPlayers()
      ? PlayerRoles.Guesser
      : PlayerRoles.Artist;

    const playerName: string = 'Player' + (gameLobby.getPlayers().length) + 1;

    const otherPlayers: Player[] = gameLobby.getPlayers().filter(p => p.id !== socket.id);

    // Temp name
    const player: Player = new Player(socket.id, playerRole, playerName);

    // If the player was successfully added to the lobby
    if (gameLobby.addPlayer(player)) {

      // Join the game lobby
      socket.join(lobbyName);

      // Send the playerRole to the client
      // socket.emit('thisPlayerWasAdded', );

      // Return the player info to the player
      returnPlayerInfo({
        guid: player.guid,
        score: 0,
        name: playerName,
        role: playerRole
      }, otherPlayers.map((p: Player): ClientPlayer => ({
        guid: p.guid,
        name: p.name,
        role: p.role,
        score: p.getScore()
      })));

      // Emit new player to rest of room
      socket.to(gameLobby.roomName).emit('newPlayer', {
        name: playerName,
        guid: player.guid,
        role: playerRole,
        score: 0
      } as ClientPlayer);

      // Log the event
      console.log('User', player.name, 'joined lobby:', lobbyName);

      // -- Additional events -- //

      // Artist Ready
      socket.on('ready', () => {
        const artistPlayer: Player = gameLobby.getArtistPlayer();

        // Check that the player is the Artist of the game
        if (artistPlayer.id === socket.id) {
          // Send Subject choices
          socket.emit('newSubjectChoices', getRandomSubjects(3, gameLobby.getPreviousSubjects()));
        } else { // If player is a Guesser, send currentSubject
          console.log(gameLobby.currentSubject);
          if (gameLobby.currentSubject) {
            socket.emit('newSubject', gameLobby.getSubjectPlaceholder());
          }
        }
      });

      // New Subject Chosen
      socket.on('newSubjectChosen', (subject: Subject) => {

        if (!gameLobby.roundIsActive) {
          return;
        }

        const artistPlayer: Player = gameLobby.getArtistPlayer();

        console.log(subject);

        if (!subject || artistPlayer.id !== socket.id) {
          return;
        }

        // Set the current Subject
        gameLobby.setCurrentSubject(subject);

        // Emit the new subject to all Guesser (AKA. all but the Artist)
        socket.to(gameLobby.roomName).emit('newSubject', gameLobby.getSubjectPlaceholder());
      });

      socket.on('guess', (guess: string, callback: (wasCorrect: boolean) => void) => {

        if (!guess) {
          return;
        }

        const artistPlayer: Player = gameLobby.getArtistPlayer();

        // Check if is Artist player
        if (socket.id === artistPlayer.id) {
          return;
        }

        const currentSubject: Subject = gameLobby.getCurrentSubject();
        const player: Player | undefined = gameLobby.getPlayerById(socket.id);

        if (!currentSubject || !player) {
          return;
        }

        socket.to(gameLobby.roomName).emit('otherPlayerGuess', {
          playerGuid: player.guid,
          guess
        } as {
          playerGuid: string;
          guess: string;
        });

        // Check if guess matches subject (without spaces)
        if (currentSubject.text.toLowerCase() === guess.toLowerCase()) {
          if (!gameLobby.roundIsActive) {
            return;
          }

          callback(true);

          player.incrementScore();

          io.to(gameLobby.roomName).emit('winnerOfRound', {
            guid: player.guid,
            score: player.getScore()
          });

          // Start next round
          const newArtistPlayer: Player | false = gameLobby.startNextRound();

          if (!newArtistPlayer) {
            console.log('There was an error setting new artist player');
            return;
          }

          io.to(gameLobby.roomName).emit('newArtist', newArtistPlayer.guid);
        } else {
          callback(false);
        }
      });

      // Canvas events
      socket.on('event', (event: string) => {
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
    const oldGameLobbyLength: number = gameLobbies.length;
    gameLobbies = gameLobbies.filter((lobby): boolean => lobby !== gameLobby);
    console.log('Removed lobby - ', gameLobby.roomName);
    return oldGameLobbyLength > gameLobbies.length;
  } catch (error) {
    return false;
  }
}

function checkForMissingArtist(gameLobby: GameLobby) {

  // If no artistPlayer was found
  if (gameLobby.hasPlayers() && !gameLobby.getPlayers().find(p => p.role === PlayerRoles.Artist)) {
    // Set the first player remaining to be the Artist
    const player: Player = gameLobby.getPlayers()[0];
    setArtistPlayer(player, gameLobby);
  }
}

function setArtistPlayer(player: Player, gameLobby: GameLobby) {
  gameLobby.setArtistPlayer(player.id);

  io.to(player.id).emit('newArtist', player.guid);
}

// app.get("/", (req: any, res: any) => {
//   console.log('Sent file');
//   res.sendFile(path.resolve("./client/index.html"));
// });
