import React, { createRef } from 'react';
import s from './GuesserCanvas.module.scss';
import { fabric } from 'fabric';
import { ICanvasEvent } from '../../models/ICanvasEvent';
import { CanvasEventTypes } from '../../models/CanvasEventTypes';
import { IObjectEvent } from '../../models/IObjectEvent';
import { ObjectEventTypes } from '../../models/ObjectEventTypes';
import { IGameEvent } from '../../models/IGameEvent';
import { IObjectChanges } from '../../models/IObjectChanges';
import { IImageInfo } from '../../models/IImageInfo';

export interface GuesserCanvasProps {
	refreshInterval: number;
	gameEvents: IGameEvent[];
}

export interface GuesserCanvasState { }

export class GuesserCanvas extends React.Component<GuesserCanvasProps, GuesserCanvasState> {
	private canvasRef = createRef<HTMLCanvasElement>();
	private c: fabric.StaticCanvas | undefined;

	public render() {
		const canvasProps: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> = {
			height: 800,
			width: 600
		};

		return (
			<div>
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
					<div className={s.wrapper}>
						<h3>Guesser</h3>
						<canvas {...canvasProps} className={s.canvas} ref={this.canvasRef} />
					</div>
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

	public componentDidUpdate(prevProps: GuesserCanvasProps, prevState: GuesserCanvasState): void {

		const {
			gameEvents
		} = this.props;

		if (
			prevProps.gameEvents
			&& gameEvents
			&& prevProps.gameEvents.length < gameEvents.length
		) {
			const newUpdate: IGameEvent = gameEvents[gameEvents.length - 1];

			let oldUpdate: IGameEvent | undefined;

			if (gameEvents.length > 1) {
				oldUpdate = gameEvents[gameEvents.length - 2];
			}

			if (!newUpdate) {
				return;
			}

			if (newUpdate.cEvents) {
				this.translateAndExecuteCanvasEvents(newUpdate.cEvents);
			}

			if (newUpdate.oEvents) {
				if (oldUpdate && oldUpdate.oEvents) {
					this.translateAndExecuteObjectEvents(newUpdate.oEvents, oldUpdate.oEvents);
				} else {
					this.translateAndExecuteObjectEvents(newUpdate.oEvents);
				}
			}

			// console.log(newUpdate);
		}
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
				}
			}
		)
	}

	private translateAndExecuteObjectEvents = (events: IObjectChanges, oldEvents?: IObjectChanges): void => {
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
						animationProperties.top = change.data as number;
						break;

					case ObjectEventTypes.left:
						animationProperties.left = change.data as number;
						break;

					case ObjectEventTypes.angle:

						const angles: { old: number; new: number; } = change.data;

						if (!this.c || o.angle == null || !angles || angles.old == null || angles.new == null) {
							return;
						}


						const angleDifference: number = (angles.new - o.angle);

						if (angleDifference > 180) {
							o.set('angle', o.angle + 360);
						} else if (angleDifference < -180) {
							o.set('angle', o.angle - 360);
						}

						// const numberOfRotations: number = Math.floor(Math.abs(o.angle) / 360);

						// let valueToAdd: number = angleDifference > 180
						// 	? angles.new - 360
						// 	: angleDifference < -180
						// 		? angles.new + 360
						// 		: angles.new;

						// if (o.angle < 0) {
						// 	valueToAdd -= 360 * numberOfRotations;
						// } else {
						// 	valueToAdd += 360 * numberOfRotations;
						// }


						console.log(o.angle);
						// console.log({ numberOfRotations, angleDifference, valueToAdd });

						animationProperties.angle = angles.new;
						break;

					case ObjectEventTypes.scale:
						animationProperties.scaleX = change.data as number;
						animationProperties.scaleY = change.data as number;
						break;
				}
			});

			(o as any).animate(
				animationProperties,
				{
					duration: this.props.refreshInterval,
					easing: (t: number, b: number, c: number, d: number): number => c * t / d + b,
					onChange: () => {
						if (this.c) {
							this.c.renderAll();
						}
					}
				}
			);

		});
	}

	// ---- Image methods ---- //

	private addImage = ({ name, src }: IImageInfo) => {
		if (!this.c || !name || !src) {
			return;
		}

		fabric.Image.fromURL(
			src,
			(img) => {
				if (this.c) {
					this.c.add(img);
				}
			},
			{
				name
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
}
