import React from 'react';
// import s from './App.module.scss';
import { ArtistCanvas } from '../ArtistCanvas/ArtistCanvas';
import { GuesserCanvas } from '../GuesserCanvas/GuesserCanvas';
import io from 'socket.io-client';
import { refreshInterval } from '../../config/refreshInterval';
import { PlayerRoles } from '../../models/PlayerRoles';
import { Player } from '../../models/Player';

const canvasWidth: number = 1000;

export interface AppProps {

}

export interface AppState {
	gameTime: number;
	currentPlayer: Player | undefined;
}

export class App extends React.Component<AppProps, AppState> {

	private socket: SocketIOClient.Socket = io('http://localhost:3001');

	constructor(props: AppProps) {
		super(props);
		this.state = {
			/**
			 * GameTime in miliseconds
			 */
			gameTime: 0,
			currentPlayer: undefined
		};
	}

	public render() {

		const {
			gameTime,
			currentPlayer
		} = this.state;

		if (!currentPlayer || currentPlayer.role == null) {
			return <div>
				Loading...
			</div>;
		}

		const commonCanvasProps: any = {
			ioSocket: this.socket,
			width: canvasWidth
		}

		const canvasElement: JSX.Element = currentPlayer.role === PlayerRoles.Guesser
			? <GuesserCanvas {...commonCanvasProps} />
			: <ArtistCanvas {...commonCanvasProps} />;

		return (
			<div>
				{gameTime}
				<div>
					{canvasElement}
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		setInterval(this.incrementTimer, refreshInterval);

		this.socket.on('connect', () => {
			this.socket.emit('joinLobby', 'TestLobbyName');

			this.socket.on('wasAddedToGame', (info: Player) => {
				this.setState({
					currentPlayer: info
				});
			});

			this.socket.on('newRole', (newRole: PlayerRoles) => {
				if (this.state.currentPlayer && newRole != null) {
					this.setState({
						currentPlayer: { ...this.state.currentPlayer, role: newRole }
					}
					);
				}
			});
		});
	}

	private incrementTimer = () => {
		const newTime = Math.round(this.state.gameTime + refreshInterval);

		this.setState({
			gameTime: newTime
		});
	}
}

