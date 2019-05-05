import React, { createRef } from 'react';
import s from './GuesserCanvas.module.scss';
import { fabric } from 'fabric';
import { ISavedFabricObject } from '../../models/ISavedFabricObject';
import { ICanvasEvent } from '../../models/ICanvasEvent';
import { CanvasEventTypes } from '../../models/CanvasEventTypes';
import { IObjectEvent } from '../../models/IObjectEvent';
import { ObjectEventTypes } from '../../models/ObjectEventTypes';
import { IGameEvent } from '../../models/IGameEvent';
import { IObjectChanges } from '../../models/IObjectChanges';

export interface GuesserCanvasProps {
	refreshInterval: number;
	gameEvents: IGameEvent[];
}

export interface GuesserCanvasState {}

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
			gameEvents,
			refreshInterval
		} = this.props;

		if (
			prevProps.gameEvents 
			&& gameEvents 
			&& prevProps.gameEvents.length < gameEvents.length
		) {
			const newUpdate: IGameEvent = gameEvents[gameEvents.length - 1];

			console.log(newUpdate);
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

}
