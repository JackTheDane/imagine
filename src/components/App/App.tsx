import React from 'react';
import s from './App.module.scss';
import { ArtistCanvas } from '../ArtistCanvas/ArtistCanvas';
import { IGameEvent } from '../../models/IGameEvent';
import { IGameEvents } from '../../models/IGameEvents';

const refreshInterval: number = 200; // Refresh rate in Miliseconds

export interface AppProps {
	
}
 
export interface AppState {
	gameTime: number;
	gameEvents: IGameEvents;
}
 
export class App extends React.Component<AppProps, AppState> {
	constructor(props: AppProps) {
		super(props);
		this.state = {
			/**
			 * GameTime in miliseconds
			 */
			gameTime: 0,
			gameEvents: {}
		};
	}

	public render() {

		const {
			gameTime
		} = this.state;

		return (
			<div>
				{gameTime}
				<ArtistCanvas onNewEvents={this.onNewEvent} gameTime={gameTime} refreshInterval={refreshInterval} />
			</div>
		);
	}

	public componentDidMount() {
		setInterval(this.incrementTimer, refreshInterval);
	}

	private onNewEvent = (e: IGameEvent) => {
		const {
			gameEvents,
			gameTime
		} = this.state;
		// Get a copy of the game events
		const allEvents: IGameEvents = {...gameEvents};

		// Add a new event at the timestamp
		allEvents[gameTime] = e;

		console.log({allEvents});

		// Set events to state
		this.setState({
			gameEvents: allEvents
		});
	}

	private incrementTimer = () => {

		const newTime = Math.round(this.state.gameTime + refreshInterval);

		this.setState({
			gameTime: newTime
		});
	}
}

// export const App = () => {

// 	let [gameTime, setGameTime] = React.useState<number>(0);
	
// 	const incrementGameTime = () => {
// 		setGameTime(gameTime + refreshInterval);
// 	}
	
// 	useEffect(() => {
// 		setInterval(incrementGameTime, refreshInterval);
// 	}, []);

// 	return (
		// <div>
		// 	{gameTime}
		// 	<ArtistCanvas gameTime={gameTime} refreshInterval={refreshInterval} />
		// </div>
// 	);
// }