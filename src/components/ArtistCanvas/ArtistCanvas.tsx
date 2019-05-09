import React, { createRef } from 'react';
import s from './ArtistCanvas.module.scss';
import { fabric } from 'fabric';
import { ISavedFabricObject } from '../../models/ISavedFabricObject';
import { ICanvasEvent } from '../../models/ICanvasEvent';
import { CanvasEventTypes } from '../../models/CanvasEventTypes';
import { IObjectEvent } from '../../models/IObjectEvent';
import { ObjectEventTypes } from '../../models/ObjectEventTypes';
import { IGameEvent } from '../../models/IGameEvent';
import { IObjectChanges } from '../../models/IObjectChanges';
import { getThirdPointInTriangle } from '../../utilities/getThirdPointInTriangle';

export interface IObjectSnapshot {
	[objectName: string]: ISavedFabricObject;
}

export enum IHistoryEventTypes {
	add,
	remove,
	snapshot
}

export interface IHistory {
	type: IHistoryEventTypes;
	data: any;
}

export interface ArtistCanvasProps {
	refreshInterval: number;
	onNewEvents: (e: IGameEvent) => void;
	width: number;
}

export interface ArtistCanvasState {
	history: IObjectSnapshot[];
	historyIndex: number;
}

export class ArtistCanvas extends React.Component<ArtistCanvasProps, ArtistCanvasState> {
	private artistRef = createRef<HTMLCanvasElement>();

	private c: fabric.Canvas | undefined;

	private storedCanvasEvents: ICanvasEvent[] = [];
	private storedObjectEvents: IObjectChanges = {};

	private objectsSnapshot: IObjectSnapshot = {};

	private objectIndex: number = 0;

	constructor(props: ArtistCanvasProps) {
		super(props);
		this.state = {
			history: [{}],
			historyIndex: 0
		};
	}

	public render() {

		const {
			width
		} = this.props;

		const {
			history,
			historyIndex
		} = this.state;

		const canvasProps: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> = {
			width,
			height: width * (0.75)
		};

		return (
			<div>
				<button
					onClick={() => this.addImage('https://upload.wikimedia.org/wikipedia/en/f/f1/Tomruen_test.svg')}
					style={{ margin: 20, padding: 10 }}
				>
					Add SVG
				</button>

				<button
					onClick={() =>
						this.addImage(
							'https://vignette.wikia.nocookie.net/simpsons/images/2/26/Woo_hoo%21_poster.jpg/revision/latest?cb=20111121223950'
						)}
					style={{ margin: 20, padding: 10 }}
				>
					Add Homer
				</button>

				<button style={{ margin: 20, padding: 10, backgroundColor: 'red', color: '#fff', border: 'none' }} onClick={this.deleteSelected}>
					Delete
				</button>

				<div>
					<button disabled={historyIndex === 0} onClick={this.undoChanges}>
						Undo
					</button>
					<button disabled={!history.length || historyIndex === history.length - 1} onClick={this.redoChanges}>
						Redo
					</button>
				</div>

				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						width: '100%',
						padding: '0 40px',
						boxSizing: 'border-box',
						alignItems: 'flex-end'
					}}
				>
					<div className={s.artistCanvasWrapper}>
						<h3>Artist</h3>
						<canvas {...canvasProps} className={s.artistCanvas} ref={this.artistRef} />
					</div>

					{history.length > 0 && JSON.stringify(history[historyIndex])}

				</div>
			</div>
		);
	}

	// ---- Life Cycles Methods ---- //

	public componentDidMount(): void {
		this.init();
	}

	public componentWillUnmount(): void {
		if (this.c) {
			this.c.dispose();
		}
	}

	// ---- Canvas Interactions ---- //

	private init = () => {
		if (
			this.c ||
			!this.artistRef ||
			!this.artistRef.current
		) {
			return;
		}

		this.c = new fabric.Canvas(this.artistRef.current, {
			centeredRotation: true,
			centeredScaling: true,
			stopContextMenu: true
		});

		fabric.Object.prototype.cornerStyle = 'circle';
		fabric.Object.prototype.borderOpacityWhenMoving = 0;
		fabric.Object.prototype.originX = 'center';
		fabric.Object.prototype.originY = 'center';
		fabric.Object.prototype.lockScalingFlip = true;
		fabric.Object.prototype.lockUniScaling = true;

		if (fabric.isTouchSupported) {
			fabric.Object.prototype.hasControls = false;
			fabric.Group.prototype.hasBorders = false;
		}

		this.addEventHandlers();

		setInterval(() => {
			try {
				if (!this.c) {
					return;
				}

				const objectSnapshot: IObjectSnapshot = {};
				// const activeObjects: fabric.Object[] = this.c.getActiveObjects();
				const allObjects: fabric.Object[] = this.c.getObjects('image');

				// Loop over the objects, to add them to the snapshot, if they are not already found
				allObjects.forEach((o) => {
					this.setNewObjectToLocalSnapShot(o, objectSnapshot);
				});

				// Construct a new game event collection
				const event: IGameEvent = {
					cEvents: this.storedCanvasEvents.length > 0 ? this.storedCanvasEvents : false,
					oEvents: this.getObjectChangesFromNewSnapshot(objectSnapshot)
				};

				// console.log(this.objectsSnapshot);

				// If any new events occurred, return the events.
				if (event.cEvents || event.oEvents) {
					this.props.onNewEvents(event);
				}

				// Set new snapshot and reset changes
				this.objectsSnapshot = objectSnapshot;
				this.storedCanvasEvents = [];
			} catch (error) {
				console.log(error);
			}
		}, this.props.refreshInterval);
	};

	private addEventHandlers = (): void => {
		if (!this.c) {
			return;
		}

		this.c.on('object:added', this.addNewImageToStored);
		this.c.on('object:removed', this.addRemoveImageToStored)
		this.c.on('selection:created', this.onSelectionCreateAndUpdate);
		this.c.on('selection:updated', this.onSelectionCreateAndUpdate);
		this.c.on('object:modified', e => {
			// console.log('Object modified ', e);
			this.setState(prevState => ({
				history: [
					...prevState.history, // Slice to only get the last 40 history snapshots. Optional: Use timeout?
					this.objectsSnapshot
				],
				historyIndex: prevState.historyIndex + 1
			}));
			console.log(this.objectsSnapshot);
		});
		this.c.on('selection:updated', this.onSelectionCreateAndUpdate);

		fabric.Object.prototype.on('mouseup', this.onMouseUp);

	};

	// -- Canvas - Event Callbacks

	private onMouseUp = (e: fabric.IEvent) => {

	};

	private deleteSelected = () => {

		if (!this.c) {
			return;
		}

		const activeObjects: fabric.Object[] = this.c.getActiveObjects();

		if (activeObjects && activeObjects.length > 0) {
			this.c.remove(...this.c.getActiveObjects());
			this.c.discardActiveObject();
		}
	}

	private onSelectionCreateAndUpdate = (e: fabric.IEvent) => {
		const s: fabric.IEvent & { selected: fabric.Object[] } = e as any;

		console.log('Selection created, ', e);
		if (!s || !s.selected || !this.c) {
			return;
		}

		const objects: fabric.Object[] = this.c.getObjects('image')
		const numberOfObjects: number = objects.length;


		// If there are no objects or all objects are selected
		if (numberOfObjects === 0 || numberOfObjects === s.selected.length) {
			return;
		}

		s.selected.forEach((o: fabric.Object, i: number) => {

			if (!o || o.name == null) {
				return;
			}

			const currentIndex: number = objects.indexOf(o);
			const newIndex: number = numberOfObjects - s.selected.length + i;

			if (currentIndex === newIndex) {
				return;
			}

			o.moveTo(newIndex);

			this.addToStoredObjectEvents(
				o.name,
				{
					type: ObjectEventTypes.moveTo,
					data: newIndex
				}
			);
		});
	}

	private addToStoredObjectEvents = (objectName: string, newEvent: IObjectEvent) => {
		const events: IObjectEvent[] | undefined = this.storedObjectEvents[objectName];
		this.storedObjectEvents[objectName] = events && events.length > 0
			? [
				...events,
				newEvent
			]
			: [newEvent];
	}

	// -- Canvas - Adders -- //

	private addImage = (src: string, options?: fabric.IImageOptions, updateState: boolean = true) => {
		if (!this.c) {
			return;
		}

		fabric.Image.fromURL(
			src,
			img => {
				if (this.c) {

					if (updateState) {
						console.log();
						this.setState({
							history: [
								...this.state.history,
								this.objectsSnapshot
							],
							historyIndex: this.state.historyIndex + 1
						});
					}

					this.c.add(img);
				}
			},
			{
				name: 'o' + this.objectIndex++,
				...options
			}
		);
	};

	// ---- Setters ---- //

	private createActiveGroupFromObjects = (objects: fabric.Object[]) => {
		if (!this.c || objects.length === 0) {
			return;
		}

		this.c.discardActiveObject();

		let newActiveObject: fabric.Object;

		if (objects.length === 1) {
			newActiveObject = objects[0];
		} else {

			//FIXME: Needs waaaay more testing

			// const group: fabric.Group = new fabric.Group();
			// group.canvas = this.c;

			// objects.forEach(o => {
			// 	group.addWithUpdate(o);
			// });

			// newActiveObject = group;

			const sel = new fabric.ActiveSelection(undefined, {
				canvas: this.c,
			});

			objects.forEach(o => {
				sel.addWithUpdate(o);
			});

			newActiveObject = sel;
		}

		this.c.setActiveObject(newActiveObject).requestRenderAll();
	}

	private addRemoveImageToStored = (e: fabric.IEvent): void => {
		if (!e || !e.target || !e.target.name) {
			return;
		}

		this.storedCanvasEvents.push({
			type: CanvasEventTypes.remove,
			data: e.target.name
		});
	}

	private addNewImageToStored = (e: fabric.IEvent): void => {
		if (!e || !e.target || !e.target.name) {
			return;
		}

		const image: fabric.Image = e.target as fabric.Image;

		this.storedCanvasEvents.push({
			type: CanvasEventTypes.add,
			data: {
				src: image.getSrc(),
				name: image.name
			}
		});
	};

	private undoChanges = () => {

		const index: number = this.state.historyIndex - 1

		if (
			index < 0
			|| index > this.state.history.length - 1
			|| index === this.state.historyIndex
		) {
			return;
		}

		const history: IObjectSnapshot | undefined = this.state.history[index];

		if (!history) {
			return;
		}

		this.setObjectsFromSnapshot(history);
	}

	private redoChanges = () => {
		// this.setObjectsFromHistoryIndex(this.state.historyIndex + 1);
	}

	// private setObjectsFromHistoryIndex = (index: number) => {

	// 	if (
	// 		index < 0
	// 		|| index > this.state.history.length - 1
	// 		|| index === this.state.historyIndex
	// 	) {
	// 		return;
	// 	}

	// 	const history: IHistory = this.state.history[index];

	// 	if (!history) {
	// 		return;
	// 	}

	// 	this.setObjectsFromSnapshot(history.data as IObjectSnapshot);
	// 	this.setState({
	// 		historyIndex: index
	// 	});
	// }

	private setObjectsFromSnapshot = (snapshot: IObjectSnapshot) => {
		if (!this.c || !snapshot) {
			return;
		}

		const objects: fabric.Object[] = this.c.getObjects('image');
		// const unknownObjects: fabric.Object[] = [];
		let unusedNames: string[] = Object.keys(snapshot); // These are names that where not found on the canvas

		for (let i = 0; i < objects.length; i++) {
			const o = objects[i];

			if (!o.name) {
				continue;
			}

			const oSnapshot: ISavedFabricObject | undefined = snapshot[o.name];

			// If the object does not exist in the snapshot
			if (!oSnapshot) {
				// If not found in the snapshot, remove it
				this.c.remove(o);

				continue;
			}

			// If the key was recognized

			// Filter out the used name
			unusedNames = unusedNames.filter(s => s !== o.name);

			if (o.left !== oSnapshot.left) {
				o.set('left', oSnapshot.left);
			}


			if (o.top !== oSnapshot.top) {
				o.set('top', oSnapshot.top);
			}

			if (o.angle !== oSnapshot.angle) {
				o.set('angle', oSnapshot.angle);
			}

			if (o.scaleX !== oSnapshot.scale) {
				o.set('scaleX', oSnapshot.scale);
				o.set('scaleY', oSnapshot.scale);
			}
		};

		unusedNames.forEach((name: string) => {
			const unUsedObject: ISavedFabricObject = snapshot[name];

			this.addImage(unUsedObject.src, {
				left: unUsedObject.left,
				top: unUsedObject.top,
				angle: unUsedObject.angle,
				scaleX: unUsedObject.scale,
				scaleY: unUsedObject.scale
			}, false);
		});

		this.c.renderAll();
	}

	private setNewObjectToLocalSnapShot = (object: fabric.Object, snapShot: IObjectSnapshot) => {
		// Check for object name and that it is not already set to the snapShot
		if (object.name && !snapShot[object.name]) {
			const savedFabricObject: ISavedFabricObject | undefined = this.getSavedFabricObjectFromObject(object);

			// Check if savedFabricObject was returned correctly
			if (savedFabricObject) {
				snapShot[object.name] = savedFabricObject; // If so, set to snapshot
			}
		}
	};

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

		const { top, left, scaleX, scaleY, angle, group, getSrc } = object as fabric.Image;

		const r: ISavedFabricObject = {
			top: 0,
			scale: 1,
			left: 0,
			angle: 0,
			src: getSrc()
		};

		if (top != null) {
			r.top += top;
		}

		if (left != null) {
			r.left += left;
		}

		if (angle != null) {
			r.angle += angle;
		}

		if (scaleX != null) {
			r.scale = scaleX;
		} else if (scaleY != null) {
			r.scale = scaleY;
		}

		if (group) {

			if (group.angle) {
				r.angle += group.angle;

				if (object.top != null && object.left != null) {
					const [x, y]: [number, number] = getThirdPointInTriangle(0, 0, object.left, object.top, group.angle);

					r.left = x;
					r.top = y;
				}
			}

			if (group.scaleX != null && group.scaleX !== 1) {
				r.scale = r.scale * group.scaleX;
				r.top = r.top * group.scaleX;
				r.left = r.left * group.scaleX;

			} else if (group.scaleY != null && group.scaleY !== 1) {
				r.scale = r.scale * group.scaleY;
				r.top = r.top * group.scaleY;

				r.left = r.left * group.scaleY;
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
			scale: +r.scale.toFixed(2), // Round down to two decimals. "+" ensures that a number is returned
			src: r.src
		};
	};

	private getObjectChangesFromNewSnapshot = (newSnapshot: IObjectSnapshot): IObjectChanges | false => {
		if (!this.c || !this.objectsSnapshot || !newSnapshot) {
			return false;
		}

		const changes: IObjectChanges = {};

		// Loop through all of the keys of the old snapshot
		Object.keys(this.objectsSnapshot).forEach((name: string) => {
			const newObject: ISavedFabricObject = newSnapshot[name];

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
					data: newObject.left
				});
			}

			if (newObject.top !== oldObject.top) {
				changesArray.push({
					type: ObjectEventTypes.top,
					data: newObject.top
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
					data: newObject.scale
				});
			}

			if (changesArray.length > 0) {
				changes[name] = changesArray;
			}
		});

		// Reset storedObjectEvents
		this.storedObjectEvents = {};

		return Object.keys(changes).length > 0 ? changes : false;
	};
}
