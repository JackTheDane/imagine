import { PlayerRoles } from './PlayerRoles';
export class Player {
  constructor(
    id: string,
    role: PlayerRoles,
    name: string
  ) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.score = 0;
  }

  // Properties
  readonly id: string;
  readonly name: string;
  private score: number;
  public role: PlayerRoles;

  // Methods
  public getScore = (): number => {
    return this.score;
  }

  public incrementScore = (): void => {
    this.score++;
  }

  public resetScore = (): void => {
    this.score = 0;
  }
}
