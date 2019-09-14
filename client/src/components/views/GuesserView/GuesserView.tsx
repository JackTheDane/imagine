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

export interface GuesserViewProps extends ISharedViewProps {
	onGuess: (guess: string) => void;
}

export interface GuesserViewState {
	placeholder?: SubjectPlacerholder;
	numberOfPlaceholderFields: number;
	guessText: string;
	lastGuessIncorrect: boolean;
}

export class GuesserView extends React.Component<GuesserViewProps, GuesserViewState> {
	private canvasRef = createRef<HTMLCanvasElement>();
	private c: fabric.StaticCanvas | undefined;
	private inputRef = createRef<HTMLInputElement>();
	private _isMounted: boolean;

	constructor(props: GuesserViewProps) {
		super(props);

		this._isMounted = true;

		this.state = {
			placeholder: undefined,
			numberOfPlaceholderFields: 0,
			guessText: '',
			lastGuessIncorrect: false
		}
	}

	public render() {

		const {
			canvasWidth
		} = this.props;

		const {
			guessText
		} = this.state;

		const canvasProps: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> = {
			width: canvasWidth,
			height: canvasWidth * (0.75)
		};

		return (
			<div>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						width: '100%',
						boxSizing: 'border-box',
						alignItems: 'flex-end'
					}}
				>
					<div className={s.wrapper}>
						<div style={{ display: 'flex' }}>
							<h3>Guesser</h3>
							<input
								className={s.guessInput}
								ref={this.inputRef}
								onChange={this.onInputChange}
								value={guessText}
							/>
							{this.getPlaceholderUI()}
						</div>
						<canvas {...canvasProps} className={s.canvas} ref={this.canvasRef} />
					</div>
				</div>
			</div>
		);
	}

	// ---- Life Cycles Methods ---- //

	public componentDidMount(): void {
		this.init();

		const {
			ioSocket
		} = this.props;

		ioSocket.emit('ready');

		ioSocket.on('newSubject', (placeholder: SubjectPlacerholder) => {
			if (!this._isMounted || !placeholder || !placeholder.placeholder) {
				return;
			}

			const numberOfPlaceholderFields: number = placeholder.placeholder.reduce(
				(accumulator, currentValue) => accumulator + currentValue
			);

			console.log(placeholder);
			this.setState({
				placeholder,
				numberOfPlaceholderFields,
				guessText: ''
			});
		});



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
			ioSocket.off('newSubject');
			ioSocket.off('cEvent');
		}
	}

	// ---- UI ---- //

	private onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {

		const {
			placeholder,
			numberOfPlaceholderFields
		} = this.state;

		this.setState({
			lastGuessIncorrect: false
		});

		const newText: string = e.target.value.replace(/\s/g, '');

		if (
			!placeholder
			|| !placeholder.placeholder
			|| !numberOfPlaceholderFields
		) {
			return;
		}

		// If the text is longer than the number of placeholder fields, return
		if (numberOfPlaceholderFields < newText.length) {
			return;
		}

		this.setState({
			guessText: newText
		});
	}

	private getPlaceholderUI = (): JSX.Element | undefined => {
		const {
			placeholder,
			guessText,
			numberOfPlaceholderFields,
			lastGuessIncorrect
		} = this.state;

		const guessTextLength: number = guessText.length;
		const guessTextArray: string[] = guessText.split('');
		let overAllIndex: number = -1;

		return placeholder && (
			<div
				className={s.placeholderWrapper}
				style={{ display: 'flex' }}
				onClick={() => {
					if (this.inputRef && this.inputRef.current) {
						this.inputRef.current.focus();
					}
				}}
			>
				<span>
					<i className="material-icons"> {placeholder.topic.iconName} </i>
					{placeholder.topic.name}
				</span>
				<div style={{ display: 'flex' }}>
					{placeholder.placeholder.map(
						(numberOfLetters: number, j: number): JSX.Element => (
							<div key={`ph${j}`} style={{ display: 'flex', marginRight: 15 }}>
								{
									Array.apply(null, Array(numberOfLetters)).map(
										(undef: any, i: number): JSX.Element => {
											overAllIndex++;
											return (
												<div
													key={`phl${i}`}
													style={{
														backgroundColor: lastGuessIncorrect ? 'red' : 'white'
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
				<button
					onClick={this.onGuessSubmission}
					disabled={guessText.length < numberOfPlaceholderFields}
				>
					Submit
				</button>
			</div>
		);
	}

	// Guess submission
	private onGuessSubmission = () => {
		const {
			ioSocket
		} = this.props;

		const {
			guessText,
			placeholder
		} = this.state;

		if (
			!ioSocket
			|| !guessText
			|| !placeholder
			|| !placeholder.placeholder
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
			this.setState({
				lastGuessIncorrect: !answerWasCorrect
			});
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
						if (this.c) {
							this.c.renderAll();
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
		const imageToRemove: fabric.Object | undefined = objects.find(o => o.name != null && o.name === name);

		if (imageToRemove) {
			this.c.remove(imageToRemove);
		}
	}

	// ---- Utilities ---- //
	private getValueFromHeightScale = (value: number): number => value * getCanvasHeightFromWidth(this.props.canvasWidth);
	private getValueFromWidthScale = (value: number): number => value * this.props.canvasWidth;
}
