import { IGameEvent } from "./IGameEvent";

export interface IGameEvents {
	[timeStamp: string]: IGameEvent;
}