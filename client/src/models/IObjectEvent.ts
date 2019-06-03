import { ObjectEventTypes } from "./ObjectEventTypes";

export interface IObjectEvent {
	/**
	 * The event type. This will determine what type of action will be performed on the object.
	 */
	type: ObjectEventTypes;
	/**
	 * The data used to perform the change. This will depend of the type of event.
	 */
	data: any;
}