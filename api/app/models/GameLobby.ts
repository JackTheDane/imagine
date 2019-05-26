import { Player } from "./Player";
import { PlayerRoles } from "./PlayerRoles";

export class GameLobby {
  constructor(
    roomName: string
  ) {
    this.roomName = roomName;
    this.players = [];
  }

  // ---- Properties ---- //

  // Readonly, as roomName should not change after initiation
  readonly roomName: string;

  private players: Player[];
  private currentSubject: string;
  private previousSubjects: string[];


  // ---- Methods ---- //

  public getPlayers(): Player[] {
    return this.players;
  }

  public hasPlayers = (): boolean => this.players.length > 0;

  public getPlayerById(id: string): Player | undefined {
    return this.players.find(
      (player: Player): boolean => player.id === id
    );
  }

  public removePlayer(id: string) {
    this.players = this.players.filter(
      (player: Player): boolean => player.id !== id
    );
  }

  public getArtistPlayer = (): Player | undefined => this.getPlayers().find(
    (p: Player): boolean => p.role === PlayerRoles.Artist
  );

  public addPlayer(player: Player): boolean {
    // If no player was passed, or it already exists, return
    if (!player || this.getPlayerById(player.id)) {
      return false;
    }

    this.players.push(player);
    return true;
  }



}
