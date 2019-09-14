import { IObjectEvent } from "./IObjectEvent";

export interface IObjectChanges {
	[objectName: string]: IObjectEvent[];
}
