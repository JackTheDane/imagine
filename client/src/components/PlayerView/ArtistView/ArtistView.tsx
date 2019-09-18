import React, { createRef } from 'react';
import s from './ArtistView.module.scss';
import { fabric } from 'fabric';
import { ISavedFabricObject } from '../../../models/interfaces/ISavedFabricObject';
import { ISharedViewProps } from '../../../models/interfaces/ISharedViewProps';
import { getCanvasHeightFromWidth } from '../../../utils/getCanvasHeightFromWidth';
import { Subject } from '../../../models/interfaces/Subject';
import { ArtistToolbar } from './Toolbar/ArtistToolbar';
import { FigureDrawer } from './FigureDrawer/FigureDrawer';
import { SubjectChoiceDialog } from './SubjectChoiceDialog/SubjectChoiceDialog';
import { Hidden, Fab, Icon } from '@material-ui/core';
import { getCanvasWidthFromHeight } from '../../../utils/getCanvasWidthFromHeight';
import { ArtistCanvas } from '../../../models/classes/ArtistCanvas/ArtistCanvas';

export interface IObjectSnapshot {
	[objectName: string]: ISavedFabricObject;
}

export interface ArtistViewProps extends ISharedViewProps {
}

export interface ArtistViewState {
	snapshotHistory: IObjectSnapshot[];
	historyIndex: number;
	itemsSelected: boolean;
	chosenSubject: Subject | undefined;
	openMobileFigureDrawer: boolean;
	canvasWidth: number;
	hideSubject: boolean;
}

export class ArtistView extends React.Component<ArtistViewProps, ArtistViewState> {
	private artistRef = createRef<HTMLCanvasElement>();
	private canvasWrapperRef = createRef<HTMLDivElement>();
	private _isMounted: boolean;

	/**
	 * The ArtistCanvas instance for the ArtistView
	 */
	private c!: ArtistCanvas; // "!" helps indicate that the value should be set immediatly. Remove if issues occur

	// private objectsSnapshot: IObjectSnapshot = {};


	constructor(props: ArtistViewProps) {
		super(props);

		this._isMounted = true;

		this.state = {
			snapshotHistory: [{}],
			historyIndex: 0,
			itemsSelected: false,
			openMobileFigureDrawer: false,
			canvasWidth: 0,
			chosenSubject: undefined,
			hideSubject: fabric.isTouchSupported
		};
	}

	public render() {

		const {
			ioSocket
		} = this.props;

		const {
			snapshotHistory,
			historyIndex,
			itemsSelected,
			openMobileFigureDrawer
		} = this.state;

		return (
			<>

				<SubjectChoiceDialog onSelectedSubject={this.onSubjectSelected} socket={ioSocket} />

				<div
					style={{
						display: 'flex',
						width: '100%',
						height: '100%',
						boxSizing: 'border-box'
					}}
				>
					<div>
						<FigureDrawer onMobileClose={() => this.onMobileFigureChange(false)} onMobileOpen={() => this.onMobileFigureChange(true)} mobileOpen={openMobileFigureDrawer} onAddImage={(src: string) => { this.c.addNewImageToCanvas(src); if (openMobileFigureDrawer) { this.setState({ openMobileFigureDrawer: false }) } }} />
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

		// Set original scaledCanvasWidth
		this.setScaledCanvasWidth();

		// ioSocket.on('newSubjectChoices', (newSubjects: Subject[]) => {

		// 	if (!this._isMounted || !newSubjects) {
		// 		return;
		// 	}

		// 	this.setState({
		// 		availableSubjectChoices: newSubjects,
		// 		openSubjectDialog: true
		// 	});
		// });

		ioSocket.emit('ready');

		window.addEventListener('resize', this.setScaledCanvasWidth);
		window.addEventListener('keydown', this.onKeyPress);

		// instantiate a new ArtistCanvas
		this.c = new ArtistCanvas(
			ioSocket,
			this.artistRef.current,
			this.state.canvasWidth,
			this.setItemsSelected,
			this.addToSnapshotToHistory
		);

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

	private deleteActiveObjects = () => {

		const snapshot: IObjectSnapshot | false = this.c.deleteActiveObjects();

		if (snapshot) {
			// Add the snapshot to the snapshot history
			this.addToSnapshotToHistory(snapshot);
		}
	}

	// -- Key pressing callbacks -- //

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

	// -- Set state callbacks -- //

	private onMobileFigureChange = (newValue: boolean) => this.setState({ openMobileFigureDrawer: newValue });
	private setItemsSelected = (isSelected: boolean): void => this.setState({ itemsSelected: isSelected });

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

	private onSubjectSelected = (newSubject: Subject) => {

		if (!newSubject) {
			return;
		}

		this.setState({
			chosenSubject: newSubject
		});

		this.props.ioSocket.emit('newSubjectChosen', newSubject);
	}


	// -- Undo & Redo -- //

	private onUndoChanges = () => {
		this.setCanvasObjectStateByHistoryIndex(this.state.historyIndex - 1);
	}

	private onRedoChanges = () => {
		this.setCanvasObjectStateByHistoryIndex(this.state.historyIndex + 1);
	}

	// -- Snapshot history management -- //

	private addToSnapshotToHistory = (snapshot: IObjectSnapshot = this.c.getSnapshot()) => {

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

		this.c.setObjectsFromSnapshot(snapshot);
		this.setState({
			historyIndex: index
		});
	}
}
