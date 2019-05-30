import React from 'react';
// import s from './App.module.scss';
import { ArtistCanvas } from '../ArtistCanvas/ArtistCanvas';
import { GuesserCanvas } from '../GuesserCanvas/GuesserCanvas';
import io from 'socket.io-client';
import { refreshInterval } from '../../config/refreshInterval';
import { PlayerRoles } from '../../models/PlayerRoles';
import { Player } from '../../models/Player';
import { getCanvasHeightFromWidth } from '../../utilities/getCanvasHeightFromWidth';
import { getCanvasWidthFromHeight } from '../../utilities/getCanvasWidthFromHeight';

export interface AppProps {

}

export interface AppState {
	gameTime: number;
	currentPlayer: Player | undefined;
	canvasWidth: number;
	players: Player[];
}

export class App extends React.Component<AppProps, AppState> {

	private socket: SocketIOClient.Socket = io('http://192.168.0.6:3001');

	constructor(props: AppProps) {
		super(props);
		this.state = {
			/**
			 * GameTime in miliseconds
			 */
			gameTime: 0,
			currentPlayer: undefined,
			canvasWidth: 0,
			players: []
		};
	}

	public render() {

		const {
			gameTime,
			currentPlayer,
			canvasWidth,
			players
		} = this.state;

		if (!currentPlayer || currentPlayer.role == null || !canvasWidth) {
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
				Hello {currentPlayer.name}
				<div>
					{currentPlayer.guid}
					-
					{currentPlayer.score}
				</div>
				{gameTime}
				<div>
					{canvasElement}
				</div>
				<div>
					{players.map((p, i) => <div key={`player-${i}`} style={{ color: p.role !== PlayerRoles.Artist ? 'black' : 'red' }}>
						{p.guid}
						-
						{p.score}
					</div>)}
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		setInterval(this.incrementTimer, refreshInterval);

		this.setWindowSize();

		this.socket.on('connect', () => {
			console.log('Connection');
			this.socket.emit('joinLobby', 'TestLobbyName', (playerInfo: Player, otherPlayers: Player[]) => {

				if (!playerInfo || !otherPlayers) {
					console.log('Erorr setting player info');
					return;
				}

				console.log('Other players: ', otherPlayers);

				this.setState({
					currentPlayer: playerInfo,
					players: otherPlayers
				});
			});

			this.socket.on('winnerOfRound', ({ guid, score }: { guid: string; score: number; }) => {
				const {
					currentPlayer
				} = this.state;

				// Check if is current player
				if (currentPlayer && currentPlayer.guid === guid) {
					console.log('You won this round!');
					// Set the new score
					this.setState({
						currentPlayer: {
							...currentPlayer,
							score
						}
					});
					return;
				}

				// Else, player is not current player
				this.setState(
					({ players }) => ({
						players: players.map((p: Player): Player => {
							if (p.guid === guid) {
								p.score = score;
								console.log(p.name, 'has scored! : ', p.score);
							}

							return p;
						})
					})
				)
			});

			// Add new player to array
			this.socket.on('newPlayer', (player: Player) => {
				console.log('New player ', player);
				this.setState(
					({ players }) => ({
						players: [...players.filter(p => p.guid !== player.guid), player]
					})
				);
			});

			this.socket.on('otherPlayerGuess', ({ playerGuid, guess }: { playerGuid: string; guess: string; }) => {

				console.log('Guess');

				const player: Player | undefined = this.state.players.find((p): boolean => p.guid === playerGuid);

				if (!player) {
					console.log('Player not found');
					return;
				}

				console.log(player.name, 'has guessed:', guess);
			});

			this.socket.on('newArtist', (newArtistGuid: string) => {
				const {
					currentPlayer
				} = this.state;

				if (!newArtistGuid || !currentPlayer) {
					return;
				}

				// If the current player was the Artist, set to be Guesser
				if (currentPlayer.role === PlayerRoles.Artist) {
					console.log('Was artist');
					this.setState({
						currentPlayer: {
							...currentPlayer,
							role: PlayerRoles.Guesser
						}
					}
					);
				} else if (currentPlayer.guid === newArtistGuid) {
					console.log('Is new artist');
					this.setState({
						currentPlayer: {
							...currentPlayer,
							role: PlayerRoles.Artist
						}
					});
				}

				// Set all other players to be the guesser
				this.setState(
					({ players }) => ({
						players: players.map(
							(p: Player): Player => ({
								...p,
								role: p.guid !== newArtistGuid ? PlayerRoles.Guesser : PlayerRoles.Artist
							})
						)
					})
				);
			});
		});
	}

	private setWindowSize = () => {
		// Get the window dimensions (Max width 1200)
		const wWidth: number = window.innerWidth < 1200 ? window.innerWidth : 1200;
		const wHeight: number = window.innerHeight;

		// Get the scaled wHeight
		const canvasHeightFromWidth: number = getCanvasHeightFromWidth(wWidth);

		// Set the state
		this.setState({
			// If the scaled canvas height is bigger than the window
			canvasWidth: canvasHeightFromWidth > wHeight
				// get width from height
				? getCanvasWidthFromHeight(wHeight)
				// Else, use wWidth
				: wWidth
		});
	}

	private incrementTimer = () => {
		const newTime = Math.round(this.state.gameTime + refreshInterval);

		this.setState({
			gameTime: newTime
		});
	}
}

