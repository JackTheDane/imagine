import { PlayerRoles } from '../enums/PlayerRoles';
import { v4 as uuidv4 } from 'uuid';

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
    this.guid = uuidv4();
  }

  // Properties
  readonly id: string;
  readonly name: string;
  private score: number;
  public role: PlayerRoles;
  readonly guid: string;

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
