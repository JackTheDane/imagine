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

export interface IObjectSnapshot {
	[objectName: string]: ISavedFabricObject;
}

export interface ArtistCanvasProps {
	refreshInterval: number;
	onNewEvents: (e: IGameEvent) => void;
}

export interface ArtistCanvasState {
	mouseIsOverTrashCan: boolean;
	// history: any[];
}

export class ArtistCanvas extends React.Component<ArtistCanvasProps, ArtistCanvasState> {
	private artistRef = createRef<HTMLCanvasElement>();
	private trashCan = createRef<HTMLDivElement>();

	private c: fabric.Canvas | undefined;

	private storedCanvasEvents: ICanvasEvent[] = [];
	private objectsSnapshot: IObjectSnapshot = {};

	private objectIndex: number = 0;

	constructor(props: ArtistCanvasProps) {
		super(props);
		this.state = {
			mouseIsOverTrashCan: false
			// history: [],
		};
	}

	public render() {
		const canvasProps: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> = {
			height: 800,
			width: 600
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

				<button
					onClick={() => {
						if (!this.c) {
							console.log('No c');
							return;
						}
						console.log('Attempting animation');

						const objects: any[] = this.c.getObjects();
						console.log({ objects });

						this.c.discardActiveObject();

						objects.forEach((o: any) => {
							o.animate(
								{ left: 100, top: 100, scaleX: 0.2, scaleY: 0.2, angle: 30 },
								{
									duration: 5000,
									easing: function(t: number, b: number, c: number, d: number) {
										return c * t / d + b;
									},
									onChange: () => {
										if (this.c) {
											this.c.renderAll();
										}
									}
								}
							);
						});
					}}
				>
					Test
				</button>

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

					<div
						ref={this.trashCan}
						style={{
							height: 800,
							width: 200,
							marginRight: 'auto',
							backgroundColor: this.state.mouseIsOverTrashCan ? 'red' : 'pink'
						}}
					/>
				</div>
			</div>
		);
	}

	// ---- Life Cycles Methods ---- //

	public componentDidMount(): void {
		this.init();
		// setInterval(this.setGuesserCanvas, 50);
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
			// allowTouchScrolling: true
		});

		fabric.Object.prototype.cornerStyle = 'circle';
		fabric.Object.prototype.borderOpacityWhenMoving = 0;
		fabric.Object.prototype.originX = 'center';
		fabric.Object.prototype.originY = 'center';

		fabric.Image.prototype.hasControls = !fabric.isTouchSupported;

		fabric.Object.prototype.setControlsVisibility({
			mt: false, // middle-top
			ml: false, //middle-left
			mr: false, //middle-right
			mb: false //middle-bottom,
		});

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
		if (!this.c || (!this.trashCan || !this.trashCan.current)) {
			return;
		}

		this.c.on('object:added', this.addNewImageToStored);
		this.c.on('object:removed', this.addRemoveImageToStored)

		fabric.Object.prototype.on('mouseup', this.onMouseUp);

		this.trashCan.current.addEventListener('mouseenter', () => {
			this.setMouseOver(true);
		});

		this.trashCan.current.addEventListener('mouseleave', () => {
			this.setMouseOver(false);
		});
	};

	// -- Canvas - Event Callbacks

	private onMouseUp = (e: fabric.IEvent) => {
		console.log('mouse:up ', this.state.mouseIsOverTrashCan);
		if (this.state.mouseIsOverTrashCan && this.c) {
			const activeObjects: fabric.Object[] = this.c.getActiveObjects();

			if (activeObjects && activeObjects.length > 0) {
				// activeObjects.forEach( o => {
				// 	o.bringToFront();
				// });

				this.c.remove(...this.c.getActiveObjects());
				this.c.discardActiveObject();
			}
		}
	};

	// -- Canvas - Adders -- //

	private addImage = (src: string) => {
		fabric.Image.fromURL(
			src,
			(img) => {
				if (this.c) {
					this.c.add(img);
				}
			},
			{
				name: 'o' + this.objectIndex++
			}
		);
	};

	// ---- Setters ---- //

	private setMouseOver = (mouseIsOverTrashCan: boolean): void => {
		this.setState({
			mouseIsOverTrashCan
		});
	};

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

		const { top, left, scaleX, scaleY, angle, group } = object;

		const r: ISavedFabricObject = {
			top: 0,
			scale: 1,
			left: 0,
			angle: 0
		};

		if (group) {
			if (group.top != null) {
				r.top += group.top;
			}

			if (group.left != null) {
				r.left += group.left;
			}

			if (group.angle != null) {
				r.angle += group.angle;
			}

			if (group.scaleX != null) {
				r.scale = group.scaleX;
			} else if (group.scaleY != null) {
				r.scale = group.scaleY;
			}
		}

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
			r.scale += scaleX - 1;
		} else if (scaleY != null) {
			r.scale += scaleY - 1;
		}

		return {
			top: Math.round(r.top),
			angle: Math.round(r.angle),
			left: Math.round(r.left),
			scale: +r.angle.toFixed(2) // Round down to two decimals. "+" ensures that a number is returned
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

			const oldObject: ISavedFabricObject = this.objectsSnapshot[name];
			const changesArray: IObjectEvent[] = [];

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
					type: ObjectEventTypes.rotate,
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

		return Object.keys(changes).length > 0 ? changes : false;
	};
}
