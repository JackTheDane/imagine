import { MessageTypes } from './../enums/MessageTypes';
import { Player } from './Player';
export interface IMessage {
  player: Player;
  text: string;
  type?: MessageTypes;
}
