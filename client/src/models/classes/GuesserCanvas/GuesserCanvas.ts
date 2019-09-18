import { getCanvasHeightFromWidth } from "../../../utils/getCanvasHeightFromWidth";
import { ICanvasEvent } from "../../interfaces/ICanvasEvent";
import { CanvasEventTypes } from "../../enums/CanvasEventTypes";
import { IImageInfo } from "../../interfaces/IImageInfo";
import { IObjectChanges } from "../../interfaces/IObjectChanges";
import { IObjectEvent } from "../../interfaces/IObjectEvent";
import { ObjectEventTypes } from "../../enums/ObjectEventTypes";
import { scaleFactor } from "../../../config/scaleFactor";
import { refreshInterval } from "../../../config/refreshInterval";
import { fabric } from 'fabric';
import { IGameEvent } from "../../interfaces/IGameEvent";
import { rescaleAllFabricObjects } from "../../../utils/rescaleAllFabricObjects";

export class GuesserCanvas {

  private canvas!: fabric.StaticCanvas;

  private _isMounted: boolean = true;


  constructor(
    /**
     * The SocketIO client used to communicate with the server
     */
    private socket: SocketIOClient.Socket,
    /**
     * Canvas HTML element that should be used
     */
    canvasElement: HTMLCanvasElement,
    /**
     * The width of the canvas
     */
    private canvasWidth: number
  ) {

    this.canvas = new fabric.StaticCanvas(canvasElement);

    fabric.Object.prototype.lockUniScaling = true;
    fabric.Object.prototype.lockScalingFlip = true;
    fabric.Object.prototype.centeredRotation = true;
    fabric.Object.prototype.centeredScaling = true;
    fabric.Object.prototype.originX = 'center';
    fabric.Object.prototype.originY = 'center';

    this._resizeCanvas();

    socket.on('cEvent', (event: string) => {

      if (!this._isMounted) return;

      try {
        const newUpdate: IGameEvent = JSON.parse(event);

        if (newUpdate.cEvents) {
          this.translateAndExecuteCanvasEvents(newUpdate.cEvents);
        }

        if (newUpdate.oEvents) {
          this.translateAndExecuteObjectEvents(newUpdate.oEvents);
        }
      } catch (error) {
        console.log('Error parsing event, ', error);
      }
    });
  }

  public dispose = (): void => {
    this.canvas.dispose();
    this.socket.off('cEvent');
  }

  /**
   * Set a new width for the canvas to follow
   */
  public setCanvasWidth = (newWidth: number) => {

    const prevWidth: number = this.canvasWidth;

    this.canvasWidth = newWidth;
    this._resizeCanvas();

    // If the canvas had a previous width, rescale all objects
    if (prevWidth) {
      // If so, get the new scale
      const newScale: number = this.canvasWidth / prevWidth;

      // Rescale all fabric objects to the new scale
      rescaleAllFabricObjects(this.canvas, newScale);
    }
  }

  /**
   * Resizes the canvas to fit the canvasWidth
   */
  private _resizeCanvas = () => {
    this.canvas.setWidth(this.canvasWidth);
    this.canvas.setHeight(getCanvasHeightFromWidth(this.canvasWidth));
    this.canvas.renderAll();
  }

  // -- Implementing canvas changes -- //

  private translateAndExecuteCanvasEvents = (events: ICanvasEvent[]): void => {
    // Loop over all the events, checking for recognized types
    events.forEach(
      (e: ICanvasEvent): void => {
        switch (e.type) {
          case CanvasEventTypes.add:
            if (e.data) {
              this.addImage(e.data as IImageInfo);
            }
            break;

          case CanvasEventTypes.remove:
            if (e.data) {
              this.removeImage(e.data as string);
            }
            break;

          default:
            console.log('Unrecognized canvas event: ', e.type);
            break;
        }
      }
    )
  }

  private translateAndExecuteObjectEvents = (events: IObjectChanges): void => {
    if (!events) return;

    const objects: fabric.Object[] = this.canvas.getObjects('image');

    if (!objects) {
      return;
    }

    objects.forEach((o: fabric.Object): void => {
      if (!o.name) return;

      const objectChanges: IObjectEvent[] | undefined = events[o.name];

      // console.log({objectChanges});

      if (!objectChanges || objectChanges.length === 0) {
        return;
      }

      const animationProperties: {
        top?: number;
        left?: number;
        angle?: number;
        scaleX?: number;
        scaleY?: number;
      } = {};

      objectChanges.forEach((change: IObjectEvent): void => {
        if (!change || change.data == null || change.type == null) {
          return;
        }

        switch (change.type) {
          case ObjectEventTypes.top:
            animationProperties.top = this.getValueFromHeightScale(change.data as number);
            break;

          case ObjectEventTypes.left:
            animationProperties.left = this.getValueFromWidthScale(change.data as number);
            break;

          case ObjectEventTypes.moveTo:
            // Change.data should be the new index for the object
            if (change.data != null) {
              o.moveTo(change.data);
            }
            break;

          case ObjectEventTypes.angle: {
            if (o.angle == null || change.data == null) {
              return;
            }

            const angleDifference: number = (change.data - o.angle);

            if (angleDifference > 180) {
              o.set('angle', o.angle + 360);
            } else if (angleDifference < -180) {
              o.set('angle', o.angle - 360);
            }

            animationProperties.angle = change.data;
          }
            break;

          case ObjectEventTypes.scale: {
            const newScale: number = this.getValueFromWidthScale((change.data as number) / scaleFactor);
            animationProperties.scaleX = newScale;
            animationProperties.scaleY = newScale;
          }
            break;

          default:
            console.log('Object event type not recognized: ', change.type);
            break;
        }
      });

      (o as any).animate(
        animationProperties,
        {
          duration: refreshInterval,
          // easing: fabric.util.ease.easeInOutCubic,
          easing: (t: number, b: number, c: number, d: number): number => c * t / d + b,
          onChange: (e: any) => {
            try {
              this.canvas.renderAll();
            } catch (error) {
              console.log('RenderAllError', e);
            }
          }
        }
      );

    });
  }

  // ---- Image methods ---- //

  private addImage = ({ name, src, top, scale, left, angle }: IImageInfo) => {
    if (!name || !src) {
      return;
    }

    const newScale: number = this.getValueFromWidthScale(scale / scaleFactor);

    fabric.Image.fromURL(
      src,
      (img) => {
        if (this.canvas) this.canvas.add(img);
      },
      {
        name,
        top: this.getValueFromHeightScale(top),
        left: this.getValueFromWidthScale(left),
        angle,
        scaleX: newScale,
        scaleY: newScale,
      }
    );
  }

  private removeImage = (name: string) => {
    if (!name) return;

    const objects: fabric.Object[] = this.canvas.getObjects('image');
    const imagesToRemove: fabric.Object[] = objects.filter(o => o.name != null && o.name === name);

    if (imagesToRemove.length > 0) {
      for (let i = 0; i < imagesToRemove.length; i++) {
        this.canvas.remove(imagesToRemove[i]);
      }
    }
  }


  // ---- Utilities ---- //
  private getValueFromHeightScale = (value: number): number => value * getCanvasHeightFromWidth(this.canvasWidth || 1);
  private getValueFromWidthScale = (value: number): number => value * (this.canvasWidth || 1);
}
