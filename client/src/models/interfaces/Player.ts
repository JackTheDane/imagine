import { PlayerRoles } from "../enums/PlayerRoles";

export interface Player {
  guid: string;
  name: string;
  role: PlayerRoles;
  score: number;
}
