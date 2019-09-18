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
import { GuesserCanvas } from '../../../models/classes/GuesserCanvas/GuesserCanvas';

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
	private c!: GuesserCanvas;
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
				<div style={{ visibility: this.props.roundIsActive ? 'visible' : 'hidden' }} className={s.container}>

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

		if (
			!this.canvasRef ||
			!this.canvasRef.current
		) {
			return;
		}

		const {
			ioSocket
		} = this.props;

		this.c = new GuesserCanvas(ioSocket, this.canvasRef.current, this.state.canvasWidth);

		ioSocket.emit('ready');

		ioSocket.on('newSubject', this.onNewSubject);

		// Set window event listeners
		this.setScaledCanvasWidth();
		window.addEventListener('resize', this.setScaledCanvasWidth);
		window.addEventListener('keydown', this.onKeyPress);

		document.title = 'Imagine';
	}

	public componentDidUpdate(prevProps: GuesserViewProps, prevState: GuesserViewState): void {

		// Check if the canvasWidth has changed
		if (
			this.state.canvasWidth
			&& this._isMounted
			&& prevState.canvasWidth !== this.state.canvasWidth
		) {
			// Rescale all fabric objects to the new scale
			this.c.setCanvasWidth(this.state.canvasWidth);
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
}
