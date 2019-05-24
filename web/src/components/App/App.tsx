import React from 'react';
// import s from './App.module.scss';
import { ArtistCanvas } from '../ArtistCanvas/ArtistCanvas';
import { IGameEvent } from '../../models/IGameEvent';
import { GuesserCanvas } from '../GuesserCanvas/GuesserCanvas';
import io from 'socket.io-client';
import { refreshInterval } from '../../config/refreshInterval';

const canvasWidth: number = 500;

const commonProps = {
	scaleMultiplicationFactor: 100000
}

export interface AppProps {

}

export interface AppState {
	gameTime: number;
	gameEvents: IGameEvent[];
}

export class App extends React.Component<AppProps, AppState> {

	private socket: SocketIOClient.Socket = io('http://localhost:3001')

	constructor(props: AppProps) {
		super(props);
		this.state = {
			/**
			 * GameTime in miliseconds
			 */
			gameTime: 0,
			gameEvents: []
		};
	}

	public render() {

		const {
			gameTime,
			gameEvents
		} = this.state;

		return (
			<div>
				{gameTime}
				<div style={{ display: 'flex' }}>
					<ArtistCanvas ioSocket={this.socket} width={canvasWidth} {...commonProps} />
					<GuesserCanvas ioSocket={this.socket} width={canvasWidth / 2} {...commonProps} gameEvents={gameEvents} />
				</div>
			</div>
		);
	}

	public componentDidMount() {
		setInterval(this.incrementTimer, refreshInterval);
	}

	// private onNewEvent = (e: IGameEvent) => {
	// 	const {
	// 		gameEvents
	// 	} = this.state;
	// 	// Get a copy of the game events
	// 	const allEvents: IGameEvent[] = [...gameEvents, e];

	// 	// console.log({allEvents});

	// 	// Set events to state
	// 	this.setState({
	// 		gameEvents: allEvents
	// 	});
	// }

	private incrementTimer = () => {

		const newTime = Math.round(this.state.gameTime + refreshInterval);

		this.setState({
			gameTime: newTime
		});
	}
}

