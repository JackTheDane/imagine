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
import { Subject } from '../../../models/interfaces/Subject';
import { ArtistToolbar } from './Toolbar/ArtistToolbar';
import { FigureDrawer } from './FigureDrawer/FigureDrawer';
import { SubjectChoiceDialog } from './SubjectChoiceDialog/SubjectChoiceDialog';
import { Hidden, Fab, Icon } from '@material-ui/core';
import { getCanvasWidthFromHeight } from '../../../utils/getCanvasWidthFromHeight';
import { rescaleAllFabricObjects } from '../../../utils/rescaleAllFabricObjects';
import { ArtistCanvas } from './ArtistCanvas';

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

	private c: ArtistCanvas | undefined;

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
			openMobileFigureDrawer
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
						<FigureDrawer onMobileClose={() => this.onMobileFigureChange(false)} onMobileOpen={() => this.onMobileFigureChange(true)} mobileOpen={openMobileFigureDrawer} onAddImage={(src: string) => { this.addNewImageToCanvas(src); if (openMobileFigureDrawer) { this.setState({ openMobileFigureDrawer: false }) } }} />
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

		if (!this.artistRef || !this.artistRef.current) return;

		this.setScaledCanvasWidth();

		ioSocket.on('newSubjectChoices', (newSubjects: Subject[]) => {

			if (!this._isMounted || !newSubjects) {
				return;
			}

			this.setState({
				availableSubjectChoices: newSubjects,
				openSubjectDialog: true
			});
		});

		ioSocket.emit('ready');

		window.addEventListener('resize', this.setScaledCanvasWidth);
		window.addEventListener('keydown', this.onKeyPress);

		this.c = new ArtistCanvas(ioSocket, this.artistRef.current);
		document.title = 'Imagine - Your turn';
	}

	public componentDidUpdate(prevProps: ArtistViewProps, prevState: ArtistViewState): void {

		if (!this.state.canvasWidth || !this.c) return;

		// Check if the canvasWidth has changed
		if (prevState.canvasWidth !== this.state.canvasWidth) this.c.setCanvasWidth(this.state.canvasWidth);
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

}
