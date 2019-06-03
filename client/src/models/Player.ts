import { PlayerRoles } from "./PlayerRoles";

export interface Player {
  guid: string;
  name: string;
  role: PlayerRoles;
  score: number;
}
