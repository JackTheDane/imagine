import { Subject } from '../interfaces/Subject';
import { Player } from "./Player";
import { PlayerRoles } from "../enums/PlayerRoles";
import { SubjectPlacerholder } from '../interfaces/SubjectPlaceholder';

export class GameLobby {
  constructor(
    roomName: string
  ) {
    this.roomName = roomName;
    this.players = [];
    this.roundIsActive = true;
    this.previousSubjects = [];
  }

  // ---- Properties ---- //

  // Readonly, as roomName should not change after initiation
  readonly roomName: string;

  private players: Player[];
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
    this.players = this.players.filter(
      (player: Player): boolean => player.id !== id
    );
  }

  public getArtistPlayer(): Player {
    let artist: Player | undefined = this.getPlayers().find(
      (p: Player): boolean => p.role === PlayerRoles.Artist
    );

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

    return newArtistPlayer
      ? newArtistPlayer
      : false;
  }

  public addPlayer(player: Player): boolean {
    // If no player was passed, or it already exists, return
    if (!player || this.getPlayerById(player.id)) {
      return false;
    }

    this.players.push(player);
    return true;
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
}
