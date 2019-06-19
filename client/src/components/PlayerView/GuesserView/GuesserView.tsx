import React, { createRef } from 'react';
import s from './GuesserView.module.scss';
import { fabric } from 'fabric';
import { ICanvasEvent } from '../../../models/interfaces/ICanvasEvent';
import { CanvasEventTypes } from '../../../models/enums/CanvasEventTypes';
import { IObjectEvent } from '../../../models/interfaces/IObjectEvent';
import { ObjectEventTypes } from '../../../models/enums/ObjectEventTypes';
import { IGameEvent } from '../../../models/interfaces/IGameEvent';
import { IObjectChanges } from '../../../models/interfaces/IObjectChanges';
import { IImageInfo } from '../../../models/interfaces/IImageInfo';
import { ISharedViewProps } from '../../../models/interfaces/ISharedViewProps';
import { getCanvasHeightFromWidth } from '../../../utils/getCanvasHeightFromWidth';
import { refreshInterval } from '../../../config/refreshInterval';
import { scaleFactor } from '../../../config/scaleFactor';
import { SubjectPlacerholder } from '../../../models/interfaces/SubjectPlaceholder';
import { getCanvasWidthFromHeight } from '../../../utils/getCanvasWidthFromHeight';
import { rescaleAllFabricObjects } from '../../../utils/rescaleAllFabricObjects';
import { ScreenKeyboard } from './ScreenKeyboard/ScreenKeyboard';
import { Icon } from '@material-ui/core';
import { red } from '@material-ui/core/colors';
import { AutoSnackbar } from '../../AutoSnackbar/AutoSnackbar';

export interface GuesserViewProps extends ISharedViewProps {
	onGuess: (guess: string) => void;
	roundIsActive: boolean;
}

export interface GuesserViewState {
	placeholder?: SubjectPlacerholder;
	numberOfPlaceholderFields: number;
	guessText: string;
	lastGuessIncorrect: boolean;
	canvasWidth: number;
	lastErrorTimestamp: string;
}

export class GuesserView extends React.Component<GuesserViewProps, GuesserViewState> {
	private canvasRef = createRef<HTMLCanvasElement>();
	private canvasWrapperRef = createRef<HTMLDivElement>();
	private c: fabric.StaticCanvas | undefined;
	private _isMounted: boolean;

	constructor(props: GuesserViewProps) {
		super(props);

		this._isMounted = true;

		this.state = {
			placeholder: undefined,
			numberOfPlaceholderFields: 0,
			guessText: '',
			lastGuessIncorrect: false,
			canvasWidth: 0,
			lastErrorTimestamp: ''
		}
	}

	public render() {

		const {
			canvasWidth,
			guessText,
			numberOfPlaceholderFields,
			lastErrorTimestamp
		} = this.state;

		const canvasProps: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> = {
			width: canvasWidth,
			height: canvasWidth * (0.75)
		};

		return (

			<>
				<div style={{ visibility: this.props.roundIsActive ? 'visible' : 'hidden' }} className={s.gridContainer}>

					<div
						className={s.viewWrapper}
						ref={this.canvasWrapperRef}
					>

						<div className={s.canvasWrapper}>
							<canvas {...canvasProps} className={s.canvas} ref={this.canvasRef} />
						</div>

					</div>

					<div className={s.placeholderKeyboardWrapper}>
						<div>
							{this.getPlaceholderUI()}
						</div>
						<ScreenKeyboard
							onKeyClick={this.addLetterToGuess}
							onDeleteClick={this.deleteLetterFromGuess}
							onSubmit={this.onGuessSubmission}
							disableSubmit={guessText.length < numberOfPlaceholderFields}
						/>
					</div>

				</div>

				<AutoSnackbar open={false} key={lastErrorTimestamp} anchorOrigin={{ horizontal: 'center', vertical: 'top' }} message="Wrong guess, try again!" />
			</>

		);
	}

	// ---- Life Cycles Methods ---- //

	public componentDidMount(): void {

		// Start Fabric.js
		this.init();

		const {
			ioSocket
		} = this.props;

		ioSocket.emit('ready');

		ioSocket.on('newSubject', this.onNewSubject);
		ioSocket.on('cEvent', (event: string) => {

			if (!this._isMounted) {
				return;
			}

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

		// Set window event listeners
		this.setScaledCanvasWidth();
		window.addEventListener('resize', this.setScaledCanvasWidth);
		window.addEventListener('keydown', this.onKeyPress);

		document.title = 'Imagine';
	}

	public componentDidUpdate(prevProps: GuesserViewProps, prevState: GuesserViewState): void {

		if (!this.state.canvasWidth || !this.c || !this._isMounted) return;

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
			ioSocket.off('newSubject', this.onNewSubject);
			ioSocket.off('cEvent');
		}

		window.removeEventListener('resize', this.setScaledCanvasWidth);
		window.removeEventListener('keydown', this.onKeyPress);
	}

	// ---- UI ---- //

	private addLetterToGuess = (letter: string) => {

		if (!letter || !this.state.placeholder) return;

		const {
			guessText,
			numberOfPlaceholderFields
		} = this.state;

		if (numberOfPlaceholderFields <= guessText.length) return;

		this.setState(
			({ guessText }) => ({
				guessText: guessText + letter
			})
		);
	}

	private deleteLetterFromGuess = () => {

		const {
			guessText
		} = this.state;

		if (!guessText) return;

		this.setState({
			guessText: guessText.slice(0, -1),
			lastGuessIncorrect: false
		});
	}

	private onKeyPress = (e: KeyboardEvent) => {

		// Check for modifiers, and return if so
		if (
			e.shiftKey
			|| e.ctrlKey
			|| e.altKey
		) {
			return;
		}

		switch (e.key) {
			case 'Delete':
			case 'Backspace':
				this.deleteLetterFromGuess();
				return;

			case 'Space':
				return;

			case 'Enter':
				this.onGuessSubmission(); // Submit guess
				return;

			default:

				if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) { // Only add key, if key length is 1
					this.addLetterToGuess(e.key.trim())
				}
				return;
		}
	}

	private getPlaceholderUI = (): JSX.Element | undefined => {
		const {
			placeholder,
			guessText,
			lastGuessIncorrect
		} = this.state;

		const guessTextLength: number = guessText.length;
		const guessTextArray: string[] = guessText.split('');
		let overAllIndex: number = -1;

		return placeholder && (
			<div
				style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
			>
				<div
					style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '1.6em' }}
				>
					<Icon style={{ marginBottom: 5, fontSize: '1.5em' }}>
						{placeholder.topic.iconName}
					</Icon>
					{placeholder.topic.name}
				</div>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<div className={s.placeholderWrapper}>
						{placeholder.placeholder.map(
							(numberOfLetters: number, j: number): JSX.Element => (
								<div key={`ph${j}`}>
									{
										Array.apply(null, Array(numberOfLetters)).map(
											(undef: any, i: number): JSX.Element => {
												const textColor: string | undefined = lastGuessIncorrect ? red[600] : undefined
												overAllIndex++;
												return (
													<div
														key={`phl${i}`}
														style={{
															borderBottomColor: textColor,
															color: textColor
														}}
														className={`
													${s.textPlaceholderElem}
													${guessTextArray.length > 0
																? s.filledPlaceholder
																: overAllIndex === guessTextLength
																	? s.activePlaceholderField
																	: ''
															}`}
													>
														{guessTextArray.length > 0 && guessTextArray.shift()}
													</div>
												)
											}
										)
									}
								</div>
							)
						)}
					</div>
				</div>
			</div>
		);
	}

	private onNewSubject = (placeholder: SubjectPlacerholder): void => {
		if (!this._isMounted || !placeholder || !placeholder.placeholder) {
			return;
		}

		const numberOfPlaceholderFields: number = placeholder.placeholder.reduce(
			(accumulator, currentValue) => accumulator + currentValue
		);

		this.setState({
			placeholder,
			numberOfPlaceholderFields,
			guessText: ''
		});
	}

	// Guess submission
	private onGuessSubmission = () => {
		const {
			ioSocket
		} = this.props;

		const {
			guessText,
			placeholder,
			numberOfPlaceholderFields
		} = this.state;

		if (
			!ioSocket
			|| !guessText
			|| !placeholder
			|| !placeholder.placeholder
			|| guessText.length !== numberOfPlaceholderFields
		) {
			return;
		}

		let lastIndex: number = 0;

		const guessTextWithSpaces: string = placeholder.placeholder.map((ph: number): string => {
			const newIndex: number = lastIndex + ph;
			const slice: string = guessText.slice(lastIndex, newIndex);

			lastIndex = newIndex;
			return slice;
		}).join(' ');

		if (this.props.onGuess) {
			this.props.onGuess(guessTextWithSpaces);
		}


		// Emit the guess text
		ioSocket.emit('guess', guessTextWithSpaces, (answerWasCorrect: boolean) => {

			if (!this._isMounted) return;

			if (!answerWasCorrect) {
				this.setState({
					lastErrorTimestamp: Date.now() + ''
				});
			}

			this.setState({
				lastGuessIncorrect: !answerWasCorrect
			});
		});
	}

	// ---- Callbacks ---- //

	private setInitialCanvasSize = () => {

		if (!this.c || !this.state.canvasWidth) return;

		this.c.setWidth(this.state.canvasWidth);
		this.c.setHeight(getCanvasHeightFromWidth(this.state.canvasWidth));
		this.c.renderAll();
	}

	private setScaledCanvasWidth = () => {
		if (!this.canvasWrapperRef || !this.canvasWrapperRef.current || !this._isMounted) return;

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

	// ---- Canvas Interactions ---- //

	private init = () => {
		if (
			this.c ||
			!this.canvasRef ||
			!this.canvasRef.current
		) {
			return;
		}

		this.c = new fabric.StaticCanvas(this.canvasRef.current);

		fabric.Object.prototype.lockUniScaling = true;
		fabric.Object.prototype.lockScalingFlip = true;
		fabric.Object.prototype.centeredRotation = true;
		fabric.Object.prototype.centeredScaling = true;
		fabric.Object.prototype.originX = 'center';
		fabric.Object.prototype.originY = 'center';

	};

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
		if (!this.c || !events) {
			return;
		}

		const objects: fabric.Object[] = this.c.getObjects('image');

		if (!objects) {
			return;
		}

		objects.forEach((o: fabric.Object): void => {
			if (!o.name || !this.c) {
				return;
			}

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
						if (!this.c || o.angle == null || change.data == null) {
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
						if (this._isMounted && this.c) {
							try {
								this.c.renderAll();
							} catch (error) {
								console.log('RenderAllError', e);
							}
						}
					}
				}
			);

		});
	}

	// ---- Image methods ---- //

	private addImage = ({ name, src, top, scale, left, angle }: IImageInfo) => {
		if (!this.c || !name || !src) {
			return;
		}

		const newScale: number = this.getValueFromWidthScale(scale / scaleFactor);

		fabric.Image.fromURL(
			src,
			(img) => {
				if (this.c) {
					this.c.add(img);
				}
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
		if (!this.c || !name) {
			return;
		}

		const objects: fabric.Object[] = this.c.getObjects('image');
		const imagesToRemove: fabric.Object[] = objects.filter(o => o.name != null && o.name === name);

		if (imagesToRemove.length > 0) {
			for (let i = 0; i < imagesToRemove.length; i++) {
				this.c.remove(imagesToRemove[i]);
			}
		}
	}

	// ---- Utilities ---- //
	private getValueFromHeightScale = (value: number): number => value * getCanvasHeightFromWidth(this.state.canvasWidth || 1);
	private getValueFromWidthScale = (value: number): number => value * (this.state.canvasWidth || 1);
}
