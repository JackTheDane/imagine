import { fabric } from 'fabric';
import { IImageInfo } from '../../interfaces/IImageInfo';
import { ISavedFabricObject } from '../../interfaces/ISavedFabricObject';
import { CanvasEventTypes } from '../../enums/CanvasEventTypes';
import { IObjectSnapshot } from '../../../components/PlayerView/ArtistView/ArtistView';
import { IGameEvent } from '../../interfaces/IGameEvent';
import { ICanvasEvent } from '../../interfaces/ICanvasEvent';
import { IObjectChanges } from '../../interfaces/IObjectChanges';
import { refreshInterval } from '../../../config/refreshInterval';
import { getCanvasHeightFromWidth } from '../../../utils/getCanvasHeightFromWidth';
import { ObjectEventTypes } from '../../enums/ObjectEventTypes';
import { scaleFactor } from '../../../config/scaleFactor';
import { rescaleAllFabricObjects } from '../../../utils/rescaleAllFabricObjects';
import { getValueElse } from '../../../utils/getValueElse';
import { getThirdPointInTriangle } from '../../../utils/getThirdPointInTriangle';
import { IObjectEvent } from '../../interfaces/IObjectEvent';
import { getSavedFabricObjectFromObject } from '../../../utils/getSavedFabricObjectFromObject';
import { generateSnapshotsFromObjects } from '../../../utils/generateSnapshotsFromObjects';

export class ArtistCanvas {

  /**
   * The FabricJS canvas instance - Should generally not be accessed directly
   */
  public canvas!: fabric.Canvas; // Add "!" to tell TS that the canvas will definitely be initialised

  /**
   * The snapshot of the game's last recorded state. Used to detect changes between refreshes
   */
  private objectsSnapshot: IObjectSnapshot = {};

  /**
   * The index used to identify each object, via the Fabric.js "name" property
   */
  private objectIndex: number = 0;

  /**
   * Canvas events stored between refreshes. Canvas events are "large" events such as adding or removing objects from the canvas.
   */
  private storedCanvasEvents: ICanvasEvent[] = [];

  /**
   * Object events stored between refreshes. Object events are "smaller" events, such as moving or rotating an object
   */
  private storedObjectEvents: IObjectChanges = {};

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
    private canvasWidth: number,
    /**
     * Callback for when a new selection is made
     */
    private onSelectionChanged: (isSelected: boolean) => void,
    /**
     * Callback for when a new history event occurs, such as adding or removing an image, moving an object etc.
     *
     * @param snapshot The last snapshot taken, when the event occurred
     */
    private pushNewHistoryEvent: (snapshot: IObjectSnapshot) => void,
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
    this._startRefresh();
  }

  // TODO: Add public method for setting the canvas state from history object

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

  // -- Canvas - Event Callbacks -- //

  public deleteActiveObjects = (): IObjectSnapshot | false => {

    const activeObjects: fabric.Object[] = this.canvas.getActiveObjects();

    // Check if any active objects exists in the canvas. If not, return false to indicate no change
    if (!activeObjects || activeObjects.length === 0) return false;

    this.canvas.remove(...activeObjects);
    this.canvas.discardActiveObject();

    // Get current snapshot and remove the object from it. Then, set it to the snapshot history
    const snapshot: IObjectSnapshot = { ...this.objectsSnapshot };

    activeObjects.forEach(o => {
      if (!o.name) {
        return;
      }
      // Delete the property from the snapshot
      delete snapshot[o.name];
    });

    // TODO: Consider if this could be removed, so it doesn't need a seperate callback?
    // this.objectsSnapshot = snapshot;

    // this.pushNewHistoryEvent(snapshot);

    return snapshot;
  }

	/**
	 * Sets the Canvas Objects state based on a snapshot
	 *
	 * @param IObjectSnapshot
	 */
  public setObjectsFromSnapshot = (snapshot: IObjectSnapshot): void => {
    if (!snapshot) return;

    if (this.canvas.getActiveObject()) {
      this.canvas.discardActiveObject();
    }

    // Get all Canvas Objects
    const objects: fabric.Object[] = this.canvas.getObjects('image');


    // These are names that where not found on the canvas
    let notYetUsedSnapshots: string[] = Object.keys(snapshot);

    const usedObject: fabric.Object[] = [];

    const addToUsedObjects = (object: fabric.Object) => {
      if (!usedObject.includes(object)) {
        usedObject.push(object);
      }
    }

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];

      if (!o.name) {
        this.canvas.remove(o);
        continue;
      }

      const oSnapshot: ISavedFabricObject | undefined = snapshot[o.name];

      // If the object does not exist in the snapshot
      if (!oSnapshot) {
        // If not found in the snapshot, remove it and continue
        this.canvas.remove(o);
        continue;
      }

      // If the a matching key was found between the two snapshots, remove it from "notYetUsedSnapshots"
      notYetUsedSnapshots = notYetUsedSnapshots.filter((name: string): boolean => name !== o.name);

      // Check all of the properties for differences, and if any are found, set the object values to those of the snapshot
      const checkAndSetProperty = (property: 'left' | 'top' | 'angle'): void => {
        if (o[property] !== oSnapshot[property]) {
          o.set(property, oSnapshot[property]);
          addToUsedObjects(o);
        }
      }

      checkAndSetProperty('left');
      checkAndSetProperty('top');
      checkAndSetProperty('angle');

      if (o.scaleX !== oSnapshot.scale) {
        o.set('scaleX', oSnapshot.scale);
        o.set('scaleY', oSnapshot.scale);
        addToUsedObjects(o);
      }
    };

    // Run through each
    notYetUsedSnapshots.forEach((name: string) => {

      const {
        scale,
        src,
        ...rest
      } = snapshot[name];

      this.addImageToCanvas(
        src, {
        ...rest,
        name,
        scaleX: scale,
        scaleY: scale
      }
      );
    });

    if (usedObject.length > 0) {
      const sel = new fabric.ActiveSelection(usedObject, {
        canvas: this.canvas
      });

      this.canvas.setActiveObject(sel).requestRenderAll();
    }
  }

  public getSnapshot = (): IObjectSnapshot => this.objectsSnapshot;

  // -- Canvas - Adders -- //

  public addNewImageToCanvas = (src: string, options?: fabric.IImageOptions): void => {

    this.addImageToCanvas(src, options)
      .then(img => {
        if (!img.name) {
          return;
        }

        const savedFabricObject: ISavedFabricObject | undefined = getSavedFabricObjectFromObject(img);

        if (!savedFabricObject) {
          return;
        }

        // Get current snapshot and add the new image to it
        const snapshot: IObjectSnapshot = {
          ...this.objectsSnapshot,
          [img.name]: savedFabricObject
        };

        // Add new snapshot to snapshot history
        this.pushNewHistoryEvent(snapshot);
      })
  }

  private addImageToCanvas = (src: string, options?: fabric.IImageOptions): Promise<fabric.Image> => {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject();
        return;
      }

      const imgOptions: fabric.IImageOptions = { ...options };

      if (!options || !options.name) {
        imgOptions.name = 'o' + this.objectIndex++;
      }

      fabric.Image.fromURL(
        src,
        (img: fabric.Image) => {
          // Get the smallest axis of the image
          const smallestAxis: number = (img.width as number) >= (img.height as number) ? (img.width as number) : (img.height as number);

          // This ensures that an image cannot scale to be smaller than 80px on its smallest scale (Height or width)
          img.minScaleLimit = 120 / smallestAxis;

          if (img.minScaleLimit > 1) {
            img.scaleX = img.minScaleLimit;
            img.scaleY = img.minScaleLimit;
          }

          img.scaleToWidth(200);

          if (!img.top || !img.left) {
            img.top = this.canvas.getHeight() / 2;
            img.left = this.canvas.getWidth() / 2;
          }

          this.canvas.add(img);

          this.canvas.setActiveObject(img);

          resolve(img);
        },
        imgOptions
      );
    });
  };

  private getObjectChangesFromSnapshot = (snapshot: IObjectSnapshot): IObjectChanges | false => {
    if (!this.objectsSnapshot || !snapshot) return false;

    const changes: IObjectChanges = {};

    // Loop through all of the keys of the old snapshot
    Object.keys(this.objectsSnapshot).forEach((name: string) => {
      const newObject: ISavedFabricObject = snapshot[name];

      // If an equivalent object does not exist on the new snapshot, return
      if (!newObject) {
        return;
      }

      const storedObjectChanges: IObjectEvent[] = this.storedObjectEvents[name];
      const oldObject: ISavedFabricObject = this.objectsSnapshot[name];
      const changesArray: IObjectEvent[] = storedObjectChanges ? [...storedObjectChanges] : [];

      // Check for changes in left coordinaties
      if (newObject.left !== oldObject.left) {
        changesArray.push({
          type: ObjectEventTypes.left,
          data: this.getValueToWidthScale(newObject.left)
        });
      }

      if (newObject.top !== oldObject.top) {
        changesArray.push({
          type: ObjectEventTypes.top,
          data: this.getValueToHeightScale(newObject.top)
        });
      }

      // Check for changes in angle
      if (newObject.angle !== oldObject.angle) {
        changesArray.push({
          type: ObjectEventTypes.angle,
          data: newObject.angle
        });
      }

      // Check for changes in scale
      if (newObject.scale !== oldObject.scale) {
        changesArray.push({
          type: ObjectEventTypes.scale,
          data: this.getScaledScale(newObject.scale)
        });
      }

      if (changesArray.length > 0) {
        changes[name] = changesArray;
      }
    });

    // Reset storedObjectEvents
    this.storedObjectEvents = {};

    return Object.keys(changes).length > 0 && changes;
  };

  // Socket.io interactions
  private sendCanvasChange = (event: IGameEvent) => {
    if (!this.socket) return;

    this.socket.emit("cEvent", JSON.stringify(event));
  }

  private getScaledImageInfo = (image: fabric.Image): IImageInfo | undefined => {

    const savedFabricObject: ISavedFabricObject | undefined = getSavedFabricObjectFromObject(image);

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
      top: this.getValueToHeightScale(top),
      left: this.getValueToWidthScale(left),
      name: image.name
    });
  }

  /**
   * Callback for whenever the selection is updated or created
   */
  private _onSelectionCreateAndUpdate = (e: fabric.IEvent) => {
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

  /**
   * Resizes the canvas to fit the canvasWidth
   */
  private _resizeCanvas = () => {
    this.canvas.setWidth(this.canvasWidth);
    this.canvas.setHeight(getCanvasHeightFromWidth(this.canvasWidth));
    this.canvas.renderAll();
  }

  // ----- Transfered functions --> Consider moving to own "Utilities" folder for better overview

  private getValueToHeightScale = (value: number): number => value / getCanvasHeightFromWidth(this.canvasWidth || 1);
  private getValueToWidthScale = (value: number): number => value / (this.canvasWidth || 1);
  private getScaledScale = (scaleValue: number): number => Math.round(this.getValueToWidthScale(scaleValue) * scaleFactor);

  private addToStoredObjectEvents = (objectName: string, newEvent: IObjectEvent) => {
    const events: IObjectEvent[] | undefined = this.storedObjectEvents[objectName];
    this.storedObjectEvents[objectName] = events && events.length > 0
      ? [
        ...events,
        newEvent
      ]
      : [newEvent];
  }

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
    this.canvas.on('selection:cleared', () => this.onSelectionChanged(false));

    // Object modification
    this.canvas.on('object:modified', e => {
      this.pushNewHistoryEvent(this.objectsSnapshot);
    });
  }

  private _startRefresh = () => {

    // Start the interval to refresh the state snapshots
    setInterval(() => {
      try {

        const allObjects: fabric.Object[] = this.canvas.getObjects('image');
        const objectSnapshot: IObjectSnapshot = generateSnapshotsFromObjects(allObjects);
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
}
