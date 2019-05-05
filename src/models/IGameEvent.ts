import { ICanvasEvent } from "./ICanvasEvent";
import { IObjectChanges } from "./IObjectChanges";

export interface IGameEvent {
  /**
   * An array of CanvasEvents that happend in the interval since last timestamp.
   * If false, then no CanvasEvents occurred.
   */
  cEvents: ICanvasEvent[] | false;
  /**
   * An array of arrays that contains that object changes made during the interval since last timestamp.
   * If false, no ObjectEvents occurred. 
   */
  oEvents: IObjectChanges | false;
}