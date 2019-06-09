import { GameLobby } from './GameLobby';
import { PlayerRoles } from '../enums/PlayerRoles';
import { v4 as uuidv4 } from 'uuid';
import * as socketio from 'socket.io';
import { ClientPlayer } from '../interfaces/ClientPlayer';
import { getRandomSubjects } from '../../utils/getRandomSubjects';
import { Subject } from '../interfaces/Subject';

export class Player {
  constructor(
    socket: socketio.Socket,
    gameLobby: GameLobby,
    role: PlayerRoles,
    name: string
  ) {
    this.socket = socket;
    this.gameLobby = gameLobby;
    this.id = this.socket.id;
    this.name = name;
    this.role = role;
    this.score = 0;
    this.guid = uuidv4();

    // Join the lobby
    this.socket.join(gameLobby.roomName);

    // Add event listeners
    this.addEventListeners();

    // Emit new player to all other players
    socket.to(gameLobby.roomName).emit('newPlayer', {
      name: this.name,
      guid: this.guid,
      role: this.role,
      score: 0
    } as ClientPlayer);

    // Log the event
    console.log('User', this.name, 'joined lobby:', gameLobby.roomName);
  }

  // Properties
  readonly socket: socketio.Socket;
  readonly id: string;
  readonly name: string;
  readonly gameLobby: GameLobby;
  private score: number;
  public role: PlayerRoles;
  readonly guid: string;

  // Methods
  public getScore(): number {
    return this.score;
  }

  public incrementScore(): void {
    this.score++;
  }

  public resetScore(): void {
    this.score = 0;
  }


  // Private
  private addEventListeners() {
    // Artist Ready
    this.socket.on('ready', () => {
      // Check that the player is the Artist of the game
      if (this.gameLobby.checkPlayerRole(PlayerRoles.Artist, this)) {
        // Send Subject choices
        this.socket.emit('newSubjectChoices', getRandomSubjects(3, this.gameLobby.getPreviousSubjects()));
      } else { // If player is a Guesser, send currentSubject
        if (this.gameLobby.currentSubject) {
          this.socket.emit('newSubject', this.gameLobby.getSubjectPlaceholder());
        }
      }
    });

    // New Subject Chosen
    this.socket.on('newSubjectChosen', (subject: Subject) => {

      if (!this.gameLobby.roundIsActive) {
        return;
      }

      if (!subject || !this.gameLobby.checkPlayerRole(PlayerRoles.Artist, this)) {
        return;
      }

      // Set the current Subject
      this.gameLobby.setCurrentSubject(subject);

      // Emit the new subject to all Guesser (AKA. all but the Artist)
      this.socket.to(this.gameLobby.roomName).emit('newSubject', this.gameLobby.getSubjectPlaceholder());
    });

    this.socket.on('guess', (guess: string, callback: (wasCorrect: boolean) => void) => {
      const answer: boolean = this.gameLobby.makeGuess(guess, this);
      callback(answer);
    });

    // Canvas events
    this.socket.on('cEvent', (event: string) => {
      // Emit event to all other members of the lobby
      this.socket.to(this.gameLobby.roomName).emit('cEvent', event);
    });
  }
}
