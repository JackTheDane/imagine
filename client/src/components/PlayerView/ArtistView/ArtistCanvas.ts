import { fabric } from 'fabric';
import { IImageInfo } from '../../../models/interfaces/IImageInfo';
import { ISavedFabricObject } from '../../../models/interfaces/ISavedFabricObject';
import { CanvasEventTypes } from '../../../models/enums/CanvasEventTypes';
import { IObjectSnapshot } from './ArtistView';
import { IGameEvent } from '../../../models/interfaces/IGameEvent';
import { ICanvasEvent } from '../../../models/interfaces/ICanvasEvent';
import { IObjectChanges } from '../../../models/interfaces/IObjectChanges';
import { refreshInterval } from '../../../config/refreshInterval';
import { getCanvasHeightFromWidth } from '../../../utils/getCanvasHeightFromWidth';
import { ObjectEventTypes } from '../../../models/enums/ObjectEventTypes';
import { scaleFactor } from '../../../config/scaleFactor';
import { rescaleAllFabricObjects } from '../../../utils/rescaleAllFabricObjects';

export class ArtistCanvas {

  // Add "!" to tell TS that the canvas will definitely be initialised

  /**
   * The FabricJS canvas instance - Should generally not be accessed directly
   */
  public canvas!: fabric.Canvas;

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
    private canvasWidth: number,
    /**
     * Callback for when a new selection is made
     */
    private onSelectionChanged: (isSelected: boolean) => void
    // On new Fig added
    // On Fig select
    // On new History Entry added
  ) {
    if (!canvasElement) return;

    // -- Setup Canvas -- //
    this.canvas = new fabric.Canvas(canvasElement, {
      centeredRotation: true,
      centeredScaling: true,
      stopContextMenu: true
    });

    // -- Set Object settings -- //
    fabric.Object.prototype.cornerStyle = 'circle';

    fabric.Object.prototype.borderOpacityWhenMoving = 0;
    fabric.Object.prototype.originX = 'center';
    fabric.Object.prototype.originY = 'center';
    fabric.Object.prototype.lockScalingFlip = true;
    fabric.Object.prototype.lockUniScaling = true;


    // -- Remove controls for touch devices -- //
    if (fabric.isTouchSupported) {
      fabric.Object.prototype.hasControls = false;
      fabric.Group.prototype.hasBorders = false;
    }

    // -- Add Event Listeners -- //

    // Run setup functioins
    this._addEventListeners();
    // this.startRefresh();
  }

  public dispose = (): fabric.Canvas => this.canvas.dispose();

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


  // Add new Fig

  // Set canvas state, based on History Entry matching index

  // Undo change

  // Redo change

  // Rescale all Figs

  private getValueToHeightScale = (value: number): number => value / getCanvasHeightFromWidth(this.canvasWidth || 1);
  private getValueToWidthScale = (value: number): number => value / (this.canvasWidth || 1);
  private getScaledScale = (scaleValue: number): number => Math.round(this.getValueToWidthScale(scaleValue) * scaleFactor);


  private _addEventListeners = () => {
    // Add and remove
    this.canvas.on('object:added', (e: fabric.IEvent): void => {

      if (!e || !e.target || !e.target.name) return;

      const imageInfo: IImageInfo | undefined = this.getScaledImageInfo(e.target as fabric.Image);


      if (!imageInfo) return;

      const {
        scale,
        ...rest
      } = imageInfo;

      this.storedCanvasEvents.push({
        type: CanvasEventTypes.add,
        data: {
          ...rest,
          scale: this.getScaledScale(scale)
        }
      });
    });

    this.canvas.on('object:removed', (e: fabric.IEvent): void => {
      if (!e || !e.target || !e.target.name) {
        return;
      }

      // Push new canvas event
      this.storedCanvasEvents.push({
        type: CanvasEventTypes.remove,
        data: e.target.name
      });
    });

    // Selection
    this.canvas.on('selection:created', this._onSelectionCreateAndUpdate);
    this.canvas.on('selection:updated', this._onSelectionCreateAndUpdate);
    this.canvas.on('selection:cleared', () => {
      this.setState({
        itemsSelected: false
      });
    });

    // Object modification
    this.canvas.on('object:modified', e => {
      this.addToSnapshotToHistory();
    });
  }

  /**
   * Callback for whenever the selection is updated or created
   */
  private _onSelectionCreateAndUpdate = () => {
    const s: fabric.IEvent & { selected: fabric.Object[] } = e as any;

    // If no selection event or no canvas, return
    if (!s || !s.selected) return;

    this.onSelectionChanged(true);

    // Get all the objects and their length
    const objects: fabric.Object[] = this.canvas.getObjects('image')
    const numberOfObjects: number = objects.length;


    // If there are no objects or all objects are selected
    if (numberOfObjects === 0 || numberOfObjects === s.selected.length) {
      return;
    }

    // Loop over each object and set its new index
    s.selected.forEach(
      (o: fabric.Object, i: number) => {

        if (!o || o.name == null) {
          return;
        }

        const currentIndex: number = objects.indexOf(o);
        const newIndex: number = numberOfObjects - s.selected.length + i;

        if (currentIndex === newIndex) {
          return;
        }

        // Move the object to its new index
        o.moveTo(newIndex);

        this.addToStoredObjectEvents(
          o.name,
          {
            type: ObjectEventTypes.moveTo,
            data: newIndex
          }
        );
      }
    );
  }

  private _startRefresh = () => {

    // Start the interval to refresh the state snapshots
    setInterval(() => {
      try {
        if (!this.c) {
          return;
        }

        const allObjects: fabric.Object[] = this.c.getObjects('image');
        const objectSnapshot: IObjectSnapshot = this.generateSnapshotsFromObjects(allObjects);
        const event: IGameEvent = {}; // The event that will be populated and sent to the server

        // Check for CanvasEvents
        const canvasEvents: ICanvasEvent[] | undefined | false = this.storedCanvasEvents.length > 0 && this.storedCanvasEvents;

        if (canvasEvents) {
          event.cEvents = canvasEvents;
        }

        // Check for objectEvents
        const objectEvents: IObjectChanges | false = objectSnapshot && this.getObjectChangesFromSnapshot(objectSnapshot);

        if (objectEvents) {
          event.oEvents = objectEvents;
        }

        // If any new events occurred, return the events.
        if ((event.cEvents || event.oEvents)) {
          this.sendCanvasChange(event);
        }

        // Set new snapshot and reset changes
        this.objectsSnapshot = objectSnapshot;
        this.storedCanvasEvents = [];
      } catch (error) {
        console.log(error);
      }
    }, refreshInterval);
  }

  private _getScaledImageInfo = (image: fabric.Image): IImageInfo | undefined => {

    const savedFabricObject: ISavedFabricObject | undefined = this.getSavedFabricObjectFromObject(image);

    if (!savedFabricObject || image.name == null) {
      return;
    }

    const {
      left,
      top,
      ...rest
    } = savedFabricObject;

    return ({
      ...rest,
      top: this._getValueToHeightScale(top),
      left: this._getValueToWidthScale(left),
      name: image.name
    });
  }

  private _getValueToHeightScale = (value: number): number => value / getCanvasHeightFromWidth(this.canvas.getWidth() || 1);
  private _getValueToWidthScale = (value: number): number => value / (this.canvas.getWidth() || 1);
}
