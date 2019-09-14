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

  // ----- Transfered functions --> Consider moving to own "Utilities" folder for better overview

  private getValueToHeightScale = (value: number): number => value / getCanvasHeightFromWidth(this.canvasWidth || 1);
  private getValueToWidthScale = (value: number): number => value / (this.canvasWidth || 1);
  private getScaledScale = (scaleValue: number): number => Math.round(this.getValueToWidthScale(scaleValue) * scaleFactor);

  /**
	 * Returns an ISavedFabricObject from a fabric.Object.
	 * This includes the coordinates of any group that the object might be part of.
	 *
	 * @param fabric.Object
	 */
  private getSavedFabricObjectFromObject = (object: fabric.Object): ISavedFabricObject | undefined => {
    if (!this.c || !object) {
      return;
    }

    const { top, left, scaleX, scaleY, angle, group } = object;

    const r: ISavedFabricObject = {
      top: getValueElse(top, 0),
      scale: getValueElse(scaleX || scaleY, 0),
      left: getValueElse(left, 0),
      angle: getValueElse(angle, 0),
      src: (object as fabric.Image).getSrc()
    };

    if (group) {

      if (group.angle) {
        r.angle += group.angle;

        if (object.top != null && object.left != null) {
          const [x, y]: [number, number] = getThirdPointInTriangle(0, 0, object.left, object.top, group.angle);

          r.left = x;
          r.top = y;
        }
      }

      const scalingFactor: number = group.scaleX || group.scaleY || 1;

      if (scalingFactor !== 1) {
        r.scale *= scalingFactor;
        r.top *= scalingFactor;
        r.left *= scalingFactor;
      }

      if (group.top != null) {
        r.top += group.top;
      }

      if (group.left != null) {
        r.left += group.left;
      }
    }

    return {
      top: Math.round(r.top),
      angle: Math.round(r.angle),
      left: Math.round(r.left),
      scale: r.scale,
      src: r.src
    };
  };

  private addToStoredObjectEvents = (objectName: string, newEvent: IObjectEvent) => {
    const events: IObjectEvent[] | undefined = this.storedObjectEvents[objectName];
    this.storedObjectEvents[objectName] = events && events.length > 0
      ? [
        ...events,
        newEvent
      ]
      : [newEvent];
  }


  private getObjectSnapshotByIndex = (index: number): IObjectSnapshot | undefined => {
    const {
      historyIndex,
      snapshotHistory
    } = this.state;

    // If the index is too low, is the same as the current index or is greater that the current length - 1, return
    if (
      index < 0
      || index > snapshotHistory.length - 1
      || index === historyIndex
    ) {
      return;
    }

    // Get the snapshot of the for the given index
    return snapshotHistory[index];
  }

	/**
	 * Sets the Canvas object state based on snapshotHistory index
	 *
	 * @param index: number
	 */
  private setCanvasObjectStateByHistoryIndex = (index: number): void => {

    const snapshot: IObjectSnapshot | undefined = this.getObjectSnapshotByIndex(index);

    if (!snapshot) {
      return;
    }

    this.setObjectsFromSnapshot(snapshot);
    this.setState({
      historyIndex: index
    });
  }

	/**
	 * Sets the Canvas Objects state based on a snapshot
	 *
	 * @param IObjectSnapshot
	 */
  private setObjectsFromSnapshot = (snapshot: IObjectSnapshot): void => {
    if (!this.c || !snapshot) {
      return;
    }

    if (this.c.getActiveObject) {
      this.c.discardActiveObject();
    }

    // Get all Canvas Objects
    const objects: fabric.Object[] = this.c.getObjects('image');


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
        this.c.remove(o);
        continue;
      }

      const oSnapshot: ISavedFabricObject | undefined = snapshot[o.name];

      // If the object does not exist in the snapshot
      if (!oSnapshot) {
        // If not found in the snapshot, remove it and continue
        this.c.remove(o);
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
        canvas: this.c
      });

      this.c.setActiveObject(sel).requestRenderAll();
    }
  }

  private generateSnapshotsFromObjects = (objects: fabric.Object[]): IObjectSnapshot => {

    const objectSnapshot: IObjectSnapshot = {};

    objects.forEach(o => {
      // Check for object name and that it is not already set to the snapShot
      if (o.name && !objectSnapshot[o.name]) {
        const savedFabricObject: ISavedFabricObject | undefined = this.getSavedFabricObjectFromObject(o);

        // Check if savedFabricObject was returned correctly
        if (savedFabricObject) {
          objectSnapshot[o.name] = savedFabricObject; // If so, set to snapshot
        }
      }
    });

    return objectSnapshot;
  };

  // -- Canvas - Adders -- //

  private addNewImageToCanvas = (src: string, options?: fabric.IImageOptions): void => {

    this.addImageToCanvas(src, options)
      .then(img => {
        if (!img.name) {
          return;
        }

        const savedFabricObject: ISavedFabricObject | undefined = this.getSavedFabricObjectFromObject(img);

        if (!savedFabricObject) {
          return;
        }

        // Get current snapshot and add the new image to it
        const snapshot: IObjectSnapshot = {
          ...this.objectsSnapshot,
          [img.name]: savedFabricObject
        };

        // Add new snapshot to snapshot history
        this.addToSnapshotToHistory(snapshot);
      })
  }

  private addImageToCanvas = (src: string, options?: fabric.IImageOptions): Promise<fabric.Image> => {
    return new Promise((resolve, reject) => {
      if (!this.c) {
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
          if (this.c) {

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
              img.top = this.c.getHeight() / 2;
              img.left = this.c.getWidth() / 2;
            }

            this.c.add(img);

            this.c.setActiveObject(img);

            resolve(img);
          }
        },
        imgOptions
      );
    });
  };

  private getObjectChangesFromSnapshot = (snapshot: IObjectSnapshot): IObjectChanges | false => {
    if (!this.c || !this.objectsSnapshot || !snapshot) {
      return false;
    }

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
    if (!this.props.ioSocket) {
      return;
    }

    this.props.ioSocket.emit("cEvent", JSON.stringify(event));
  }

  private getScaledImageInfo = (image: fabric.Image): IImageInfo | undefined => {

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
      top: this.getValueToHeightScale(top),
      left: this.getValueToWidthScale(left),
      name: image.name
    });
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
