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
import { ISharedCanvasProps } from '../../models/ISharedCanvasProps';
import { getCanvasHeightFromWidth } from '../../utilities/getCanvasHeightFromWidth';
import { refreshInterval } from '../../config/refreshInterval';
import { scaleFactor } from '../../config/scaleFactor';

export interface GuesserCanvasProps extends ISharedCanvasProps { }

export interface GuesserCanvasState { }

export class GuesserCanvas extends React.Component<GuesserCanvasProps, GuesserCanvasState> {
	private canvasRef = createRef<HTMLCanvasElement>();
	private c: fabric.StaticCanvas | undefined;

	public render() {

		const {
			width
		} = this.props;

		const canvasProps: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement> = {
			width,
			height: width * (0.75)
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

		this.props.ioSocket.on('event', (event: string) => {

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
	private getValueFromHeightScale = (value: number): number => value * getCanvasHeightFromWidth(this.props.width);
	private getValueFromWidthScale = (value: number): number => value * this.props.width;
}
