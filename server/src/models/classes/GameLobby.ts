import { Subject } from '../interfaces/Subject';
import { Player } from "./Player";
import { PlayerRoles } from "../enums/PlayerRoles";
import { SubjectPlacerholder } from '../interfaces/SubjectPlaceholder';
import * as socketio from 'socket.io';

export class GameLobby {
  constructor(
    roomName: string,
    server: socketio.Server
  ) {
    this.server = server;
    this.roomName = roomName;
    this.players = [];
    this.roundIsActive = true;
    this.previousSubjects = [];
  }

  // ---- Properties ---- //

  // Readonly, as roomName should not change after initiation
  readonly roomName: string;

  private players: Player[];
  private server: socketio.Server;
  private previousSubjects: string[];
  public currentSubject: Subject;
  public roundIsActive: boolean;


  // ---- Methods ---- //

  public getPlayers(): Player[] {
    return this.players;
  }

  public hasPlayers(): boolean { return this.players.length > 0 };

  public getPlayerById(id: string): Player | undefined {
    return this.players.find(
      (player: Player): boolean => player.id === id
    );
  }

  public getCurrentSubject(): Subject { return this.currentSubject };
  public setCurrentSubject(newSubject: Subject): void { this.currentSubject = newSubject };

  public getPreviousSubjects = (): string[] => this.previousSubjects;

  public removePlayer(id: string) {

    const originalPlayerLength: number = this.players.length;
    const player: Player | undefined = this.getPlayerById(id);

    if (!player || !this.hasPlayers()) {
      return;
    }

    this.players = this.players.filter(
      (player: Player): boolean => player.id !== id
    );

    if (this.players.length < originalPlayerLength) {
      this.server.to(this.roomName).emit('playerDisconnected', player.guid);
    }
  }

  public getArtistPlayer = (): Player | undefined => this.getPlayers().find(
    (p: Player): boolean => p.role === PlayerRoles.Artist
  );

  public getOrSetArtistPlayer(): Player {

    let artist: Player | undefined = this.getArtistPlayer();


    if (!artist) {
      const firstPlayer: Player = this.getPlayers()[0];
      firstPlayer.role = PlayerRoles.Artist;
      artist = firstPlayer;
    }

    return artist;
  };

  /**
   * Sets the artist player and resets all other users
   *
   * @param the player id
   */
  public setArtistPlayer(playerId: string): Player | false {


    try {
      const currentArtistPlayer: Player | undefined = this.getArtistPlayer();

      // If the passed id is the same as the existing id, return existing player
      if (currentArtistPlayer && currentArtistPlayer.id === playerId) {
        return currentArtistPlayer;
      }

      let newArtistPlayer: Player | undefined;

      for (let i = 0; i < this.players.length; i++) {
        const player = this.players[i];

        if (player.id !== playerId) {
          player.role = PlayerRoles.Guesser;
        } else {
          player.role = PlayerRoles.Artist;
          newArtistPlayer = player;
        }
      }

      if (newArtistPlayer) {
        this.server.to(this.roomName).emit('newArtist', newArtistPlayer.guid);
        return newArtistPlayer;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  public addPlayer(socket: socketio.Socket, name: string): Player | false {
    try {
      // If no player was passed, or it already exists, return
      if (!socket || !name || this.getPlayerById(socket.id)) {
        return false;
      }

      const newPlayerRole: PlayerRoles = this.getArtistPlayer()
        ? PlayerRoles.Guesser
        : PlayerRoles.Artist;

      // Create new player
      const player: Player = new Player(socket, this, newPlayerRole, name);

      this.players.push(player);
      return player;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks the player to see if they match a give player role
   * @param role The role that the player should be checked against
   * @param player The player to check
   */
  public checkPlayerRole(role: PlayerRoles, player: Player): boolean {

    if (role == null || !player || player.role == null) {
      return false;
    }

    const playerToCheck: Player | undefined = this.players.find((p: Player): boolean => player.id === p.id);

    if (!playerToCheck) {
      return false;
    }

    return playerToCheck.role === role;
  }

  public getSubjectPlaceholder(): SubjectPlacerholder {
    return ({
      topic: this.currentSubject.topic,
      // Split the word by spaces
      placeholder: this.currentSubject.text.split(' ').map(
        // Return number of letters in each space
        (word: string): number => word.length
      )
    })
  }

  /**
   * Initiates a new round in the gameLobby
   * Returns the new Artist player if all went well, or false if an error occurred.
   */
  public startNextRound(): Player | false {
    try {

      console.log('Next round');

      const currentArtistPlayerIndex: number = this.players.findIndex((p): boolean => p.role === PlayerRoles.Artist);

      const nextArtistPlayerIndex: number = currentArtistPlayerIndex === -1 || currentArtistPlayerIndex === this.players.length - 1
        ? 0
        : currentArtistPlayerIndex + 1;

      const newArtistPlayer: Player = this.players[nextArtistPlayerIndex];

      if (!newArtistPlayer) {
        return false;
      }

      // Push the previous subject to previousSubjects
      this.previousSubjects.push(this.currentSubject.text);

      // Reset current subject
      this.currentSubject = null;

      // Set new Artist player
      this.setArtistPlayer(newArtistPlayer.id);

      // Return new Artist player
      return newArtistPlayer;

    } catch (error) {
      console.log('Starting new round:', error);
      return false;
    }
  }

  public makeGuess(guess: string, player: Player): boolean {
    try {

      const artistPlayer: Player = this.getArtistPlayer();
      const currentSubject: Subject | undefined = this.currentSubject;

      // Return if...
      if (
        !guess
        || this.checkPlayerRole(PlayerRoles.Artist, player) // Player is Artist
        || !currentSubject // No Subject exists
        || !this.roundIsActive // Round is not active
      ) {
        return false;
      }

      // Emit guess to other players
      player.socket.to(this.roomName).emit('otherPlayerGuess', {
        playerGuid: player.guid,
        guess
      } as {
        playerGuid: string;
        guess: string;
      });

      // Check if guess matches subject (without spaces)
      if (currentSubject.text.toLowerCase() !== guess.toLowerCase()) {
        return false; // If not, return false
      }

      // Check again if round is active, in the case that another player answered first
      if (!this.roundIsActive) {
        return;
      }

      player.incrementScore();
      artistPlayer.incrementScore();

      // Emit that the player won
      this.server.to(this.roomName).emit('winnerOfRound', {
        guid: player.guid,
        score: player.getScore()
      });

      // Start next round
      this.startNextRound();

      return true;

    } catch (error) {
      console.log('Error making guess: ', error);
      return false;
    }
  }
}
