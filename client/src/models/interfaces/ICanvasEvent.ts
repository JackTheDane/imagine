import { CanvasEventTypes } from "../enums/CanvasEventTypes";

export interface ICanvasEvent {
	/**
	 * The event type. This will determine what type of action will be performed on the canvas.
	 */
	type: CanvasEventTypes;
	/**
	 * The data used to perform the change. This will depend of the type of event.
	 */
	data: any;
}
