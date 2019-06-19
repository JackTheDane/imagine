import React, { createRef } from 'react';
import s from './ArtistView.module.scss';
import { fabric } from 'fabric';
import { ISavedFabricObject } from '../../../models/interfaces/ISavedFabricObject';
import { ICanvasEvent } from '../../../models/interfaces/ICanvasEvent';
import { CanvasEventTypes } from '../../../models/enums/CanvasEventTypes';
import { IObjectEvent } from '../../../models/interfaces/IObjectEvent';
import { ObjectEventTypes } from '../../../models/enums/ObjectEventTypes';
import { IGameEvent } from '../../../models/interfaces/IGameEvent';
import { IObjectChanges } from '../../../models/interfaces/IObjectChanges';
import { ISharedViewProps } from '../../../models/interfaces/ISharedViewProps';

import { getThirdPointInTriangle } from '../../../utils/getThirdPointInTriangle';
import { getValueElse } from '../../../utils/getValueElse';
import { IImageInfo } from '../../../models/interfaces/IImageInfo';
import { getCanvasHeightFromWidth } from '../../../utils/getCanvasHeightFromWidth';
import { refreshInterval } from '../../../config/refreshInterval';
import { scaleFactor } from '../../../config/scaleFactor';
import { Subject } from '../../../models/interfaces/Subject';
import { ArtistToolbar } from './Toolbar/ArtistToolbar';
import { FigureDrawer } from './FigureDrawer/FigureDrawer';
import { SubjectChoiceDialog } from './SubjectChoiceDialog/SubjectChoiceDialog';
import { Hidden, Fab, Icon, Button, Tooltip } from '@material-ui/core';
import { getCanvasWidthFromHeight } from '../../../utils/getCanvasWidthFromHeight';
import { rescaleAllFabricObjects } from '../../../utils/rescaleAllFabricObjects';

export interface IObjectSnapshot {
	[objectName: string]: ISavedFabricObject;
}

export interface ArtistViewProps extends ISharedViewProps {
}

export interface ArtistViewState {
	snapshotHistory: IObjectSnapshot[];
	historyIndex: number;
	itemsSelected: boolean;
	availableSubjectChoices: Subject[];
	chosenSubject: Subject | undefined;
	openSubjectDialog: boolean;
	openMobileFigureDrawer: boolean;
	canvasWidth: number;
	hideSubject: boolean;
}

export class ArtistView extends React.Component<ArtistViewProps, ArtistViewState> {
	private artistRef = createRef<HTMLCanvasElement>();
	private canvasWrapperRef = createRef<HTMLDivElement>();
	private _isMounted: boolean;

	private c: fabric.Canvas | undefined;

	private storedCanvasEvents: ICanvasEvent[] = [];
	private storedObjectEvents: IObjectChanges = {};

	private objectsSnapshot: IObjectSnapshot = {};

	private objectIndex: number = 0;

	constructor(props: ArtistViewProps) {
		super(props);

		this._isMounted = true;

		this.state = {
			snapshotHistory: [{}],
			historyIndex: 0,
			itemsSelected: false,
			openSubjectDialog: false,
			availableSubjectChoices: [],
			openMobileFigureDrawer: false,
			canvasWidth: 0,
			chosenSubject: undefined,
			hideSubject: fabric.isTouchSupported
		};
	}

	public render() {

		const {
			snapshotHistory,
			historyIndex,
			itemsSelected,
			availableSubjectChoices,
			openSubjectDialog,
			openMobileFigureDrawer,
			chosenSubject,
			hideSubject
		} = this.state;

		return (
			<>

				{
					openSubjectDialog && availableSubjectChoices && availableSubjectChoices.length && (
						<SubjectChoiceDialog onSelectedSubject={this.onSubjectSelected} availableSubjects={availableSubjectChoices} />
					)
				}
				<div
					style={{
						display: 'flex',
						width: '100%',
						height: '100%',
						boxSizing: 'border-box'
					}}
				>
					<div>
						<FigureDrawer onMobileClose={() => this.onMobileFigureChange(false)} mobileOpen={openMobileFigureDrawer} onAddImage={(src: string) => { this.addNewImageToCanvas(src); if (openMobileFigureDrawer) { this.setState({ openMobileFigureDrawer: false }) } }} />
					</div>

					<div
						className={s.artistViewWrapper}
						ref={this.canvasWrapperRef}
					>
						<div className={s.artistCanvasWrapper}>
							<canvas
								className={s.artistCanvas}
								ref={this.artistRef}
							/>
						</div>

						<div style={{
							position: 'absolute',
							top: 10,
							left: 10,
							display: 'flex'
						}}>

							<Hidden mdUp implementation="css">
								<Fab style={{ marginRight: 10 }} color="primary" onClick={() => this.onMobileFigureChange(!openMobileFigureDrawer)}>
									<Icon>
										add_to_photos
									</Icon>
								</Fab>
							</Hidden>

							<ArtistToolbar
								buttonProps={[
									{
										iconName: 'undo',
										isDisabled: historyIndex === 0,
										onClick: this.onUndoChanges
									},
									{
										iconName: 'redo',
										isDisabled: !snapshotHistory.length || historyIndex === snapshotHistory.length - 1,
										onClick: this.onRedoChanges
									},
									{
										iconName: 'delete',
										onClick: this.deleteActiveObjects,
										shouldHide: !itemsSelected,
										color: 'red'
									}
								]}
							/>

						</div>

						{
							chosenSubject && <div className={s.subjectWrapper}>
								<Tooltip title={hideSubject ? 'Show subject' : 'Hide subject'} placement="top" >
									<Button onClick={() => { this.setState({ hideSubject: !hideSubject }) }}>
										<Icon>
											{hideSubject ? 'visibility' : 'visibility_off'}
										</Icon>
									</Button>
								</Tooltip>

								{!hideSubject && <>
									<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

										<div style={{ display: 'flex' }}>
											<Icon fontSize="small">
												{chosenSubject.topic.iconName}
											</Icon>
											<span style={{ marginLeft: 5 }}>
												{chosenSubject.topic.name}
											</span>
										</div>

										<div className={s.subjectText}>
											{chosenSubject.text}
										</div>
									</div>

								</>}
							</div>
						}

					</div>
				</div>

			</>
		);
	}


	// ---- Life Cycles Methods ---- //

	public componentDidMount(): void {

		const {
			ioSocket
		} = this.props;

		ioSocket.emit('ready');

		ioSocket.on('newSubjectChoices', (newSubjects: Subject[]) => {

			if (!this._isMounted || !newSubjects) {
				return;
			}

			this.setState({
				availableSubjectChoices: newSubjects,
				openSubjectDialog: true
			});
		});

		this.setScaledCanvasWidth();
		window.addEventListener('resize', this.setScaledCanvasWidth);
		window.addEventListener('keydown', this.onKeyPress);

		this.init();

		document.title = 'Imagine - Your turn';
	}

	public componentDidUpdate(prevProps: ArtistViewProps, prevState: ArtistViewState): void {

		if (!this.state.canvasWidth || !this.c) return;

		if (!prevState.canvasWidth) {
			this.setInitialCanvasSize();
			return;
		}

		// Check if the canvasWidth has changed
		if (
			prevState.canvasWidth !== this.state.canvasWidth
		) {

			// If so, get the new scale
			const newScale: number = this.state.canvasWidth / prevState.canvasWidth;

			// Rescale all fabric objects to the new scale
			rescaleAllFabricObjects(this.c, newScale);
		}
	}

	public componentWillUnmount(): void {
		if (this.c) {
			this.c.dispose();
		}

		this._isMounted = false;

		const {
			ioSocket
		} = this.props;

		if (ioSocket) {
			ioSocket.off('newSubjectChoices');
		}

		window.removeEventListener('resize', this.setScaledCanvasWidth);
		window.removeEventListener('keydown', this.onKeyPress);
	}

	// ---- Callbacks ---- //

	private setScaledCanvasWidth = () => {
		if (!this.canvasWrapperRef || !this.canvasWrapperRef.current) return;

		const {
			clientWidth,
			clientHeight
		} = this.canvasWrapperRef.current;

		// Get the scaled wHeight
		const canvasHeightFromWidth: number = getCanvasHeightFromWidth(clientWidth);

		// Set the state
		this.setState({
			canvasWidth: canvasHeightFromWidth > clientHeight
				// get width from height
				? getCanvasWidthFromHeight(clientHeight)
				// Else, use clientWidth
				: clientWidth
		});
	}

	private onMobileFigureChange = (newValue: boolean) => {
		this.setState({
			openMobileFigureDrawer: newValue
		});
	}

	private setInitialCanvasSize = () => {

		if (!this.c || !this.state.canvasWidth) return;

		this.c.setWidth(this.state.canvasWidth);
		this.c.setHeight(getCanvasHeightFromWidth(this.state.canvasWidth));
		this.c.renderAll();
	}

	private onSubjectSelected = (newSubject: Subject) => {

		if (!newSubject) {
			return;
		}

		this.setState({
			openSubjectDialog: false,
			availableSubjectChoices: [],
			chosenSubject: newSubject
		});

		this.props.ioSocket.emit('newSubjectChosen', newSubject);
	}

	// ---- Regular callbacks ---- //
	private onKeyPress = (e: KeyboardEvent) => {
		switch (e.key) {

			case 'Z':
			case 'z':
				if (e.ctrlKey) {
					// Redo if shit key
					if (e.shiftKey) {
						this.onRedoChanges();
					} else { // Else, undo
						this.onUndoChanges();
					}
				}
				return;

			case 'Y':
			case 'y': // Y
				if (e.ctrlKey) {
					this.onRedoChanges();
				}
				return;

			case 'Backspace': // Backspace
			case 'Delete': // Delete
				this.deleteActiveObjects();
				return;

			default:
				break;
		}
	}

	// ---- Canvas Utilities and Setup ---- //

	private init = () => {
		if (
			this.c ||
			!this.artistRef ||
			!this.artistRef.current
		) {
			return;
		}

		// Setup Canvas
		this.c = new fabric.Canvas(this.artistRef.current, {
			centeredRotation: true,
			centeredScaling: true,
			stopContextMenu: true
		});

		// Set Object settings
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

		// Run setup functioins
		this.addCanvasEventListeners();
		this.startRefresh();
	};

	/**
	 * Starts the refresh that updates and transmits changes to game state
	 */
	private startRefresh = () => {

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

	/**
	 * Add the Canvas event listeners
	 */

	private addCanvasEventListeners = (): void => {
		if (!this.c) {
			return;
		}

		// TODO: Research how this drag and drop works.

		this.c.on('dragenter', e => {
			// console.log(e.dataTransfer);
			console.log('Dragenter');
		});

		this.c.on('dragleave', () => {
			console.log('Dragleave');
		});

		this.c.on('drop', e => {

			try {
				// If no event or no original event was passed with the event, return empty
				if (!e || !e.e) {
					console.log('No drop event');
					return;
				}

				const event: any = e.e;

				if (!event.dataTransfer || !event.dataTransfer.getData) {
					console.log('No data transfer');
					return;
				}

				const dataTransfer: string = event.dataTransfer.getData('text');

				if (!dataTransfer) {
					console.log('No data or canvas');
					return;
				}

				this.addNewImageToCanvas(
					dataTransfer,
					{
						top: getValueElse(event.offsetY, 0),
						left: getValueElse(event.offsetX, 0)
					}
				);
				console.log('Transfer success');
			} catch (error) {
				console.log('Error while getting drop data: ', error);
			}

		});

		// Add and remove
		this.c.on('object:added', (e: fabric.IEvent): void => {

			if (!e || !e.target || !e.target.name) {
				return;
			}

			const image: fabric.Image = e.target as fabric.Image;
			const imageInfo: IImageInfo | undefined = this.getScaledImageInfo(image);

			if (!imageInfo) {
				return;
			}

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

		this.c.on('object:removed', (e: fabric.IEvent): void => {
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
		this.c.on('selection:created', this.onSelectionCreateAndUpdate);
		this.c.on('selection:updated', this.onSelectionCreateAndUpdate);
		this.c.on('selection:cleared', () => {
			this.setState({
				itemsSelected: false
			});
		});

		// Object modification
		this.c.on('object:modified', e => {
			this.addToSnapshotToHistory();
		});
	};


	// -- Canvas - Event Callbacks -- //

	private deleteActiveObjects = () => {

		if (!this.c) {
			return;
		}

		const activeObjects: fabric.Object[] = this.c.getActiveObjects();


		if (activeObjects && activeObjects.length > 0) {
			this.c.remove(...activeObjects);
			this.c.discardActiveObject();

			// Get current snapshot and remove the object from it. Then, set it to the snapshot history
			const snapshot: IObjectSnapshot = { ...this.objectsSnapshot };

			activeObjects.forEach(o => {
				if (!o.name) {
					return;
				}
				// Delete the property from the snapshot
				delete snapshot[o.name];
			});

			// Add the snapshot to the snapshot history
			this.addToSnapshotToHistory(snapshot);
		}
	}

	private onSelectionCreateAndUpdate = (e: fabric.IEvent) => {
		const s: fabric.IEvent & { selected: fabric.Object[] } = e as any;

		// If no selection event or no canvas, return
		if (!s || !s.selected || !this.c) {
			return;
		}

		this.setState({
			itemsSelected: true
		});

		// Get all the objects and their length
		const objects: fabric.Object[] = this.c.getObjects('image')
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

	// -- Undo & Redo -- //

	private onUndoChanges = () => {
		this.setCanvasObjectStateByHistoryIndex(this.state.historyIndex - 1);
	}

	private onRedoChanges = () => {
		this.setCanvasObjectStateByHistoryIndex(this.state.historyIndex + 1);
	}

	// -- Canvas Utility -- //

	private getValueToHeightScale = (value: number): number => value / getCanvasHeightFromWidth(this.state.canvasWidth || 1);
	private getValueToWidthScale = (value: number): number => value / (this.state.canvasWidth || 1);
	private getScaledScale = (scaleValue: number): number => Math.round(this.getValueToWidthScale(scaleValue) * scaleFactor);

	private addToSnapshotToHistory = (snapshot: IObjectSnapshot = this.objectsSnapshot) => {

		const {
			historyIndex,
			snapshotHistory
		} = this.state;

		// TODO: Add a check to see if the number of history events exceeds a maximun (40?) to prevent overburdening the memory

		const newIndex: number = historyIndex + 1;

		const newHistory: IObjectSnapshot[] = historyIndex < snapshotHistory.length - 1
			? snapshotHistory.slice(0, newIndex)
			: snapshotHistory;

		this.setState({
			snapshotHistory: [
				...newHistory,
				snapshot
			],
			historyIndex: newIndex
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

	// ---- Setters ---- //

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
}
