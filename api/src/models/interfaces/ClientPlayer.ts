import { PlayerRoles } from '../../../../web/src/models/PlayerRoles';

/**
 * This is the player object that the client will have access to
 */
export interface ClientPlayer {
  guid: string;
  name: string;
  score: number;
  role: PlayerRoles;
}
