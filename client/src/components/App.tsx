import React from 'react';
// import s from './App.module.scss';
import io from 'socket.io-client';
import { PlayerRoles } from '../models/enums/PlayerRoles';
import { Player } from '../models/interfaces/Player';
import { getCanvasHeightFromWidth } from '../utils/getCanvasHeightFromWidth';
import { getCanvasWidthFromHeight } from '../utils/getCanvasWidthFromHeight';
import { AutoSnackbar } from './AutoSnackbar/AutoSnackbar';
import { IMessage } from '../models/interfaces/IMessage';
import { PlayerDrawer } from './PlayerDrawer/PlayerDrawer';
import { CreateAvatarDialog } from './CreateAvatarDialog/CreateAvatarDialog';
import { PlayerView } from './PlayerView/PlayerView';
import { webSocketPort } from '../config/webSocketPort';

export interface AppState {
	currentPlayer: Player | undefined;
	canvasWidth: number;
	players: Player[];
	showNameDialog: boolean;
	playerName: string;
	userGuesses: IMessage[];
}

export class App extends React.Component<{}, AppState> {

	private socket: SocketIOClient.Socket = io(webSocketPort);

	constructor(props: {}) {
		super(props);
		this.state = {
			currentPlayer: undefined,
			canvasWidth: 0,
			players: [],
			showNameDialog: true,
			playerName: '',
			userGuesses: []
		};
	}

	public render() {

		const {
			currentPlayer,
			showNameDialog,
			userGuesses,
			players
		} = this.state;

		return (
			<>
				{currentPlayer != null && (
					<>
						<div style={{ display: 'flex' }} >
							<div style={{ flexGrow: 1 }}>
								<PlayerView ioSocket={this.socket} onGuesserGuess={this.onGuesserGuess} playerRole={currentPlayer.role} />
							</div>
							<PlayerDrawer players={players} userGuesses={userGuesses} />
						</div>
						<AutoSnackbar open={true} message={`Welcome ${currentPlayer.name}!`} />
					</>
				)}
				<CreateAvatarDialog shouldOpen={showNameDialog} onPlayerNameSubmit={this.submitName} />
			</>
		);
	}

	public componentDidMount(): void {
		this.socket.on('connect', () => {
			this.addSocketEventListeners();
		});
	}

	// ---- Game Interactions ---- //

	private addGuessToList = (player: Player, guess: string) => {
		this.setState(
			({ userGuesses }) => ({
				userGuesses: [...userGuesses, { player, text: guess }]
			})
		);
	}

	private onGuesserGuess = (guess: string) => {
		if (this.state.currentPlayer) {
			this.addGuessToList(this.state.currentPlayer, guess);
		}
	}

	private submitName = (name: string) => {
		if (!name) return;

		this.setState({
			playerName: name
		}, this.connectToLobby)
	}

	// ---- Socket.IO interactions ---- //

	private connectToLobby = () => {

		let lobbyName: string = 'General';

		try {
			const URLLobbyName: string | null = new URL(window.location.href).searchParams.get('lobby');

			if (URLLobbyName) {
				lobbyName = URLLobbyName;
			}
		} catch (error) {
			console.log('Could not set lobby name', error);
		}

		this.socket.emit('joinLobby',
			lobbyName,
			this.state.playerName,
			(playerInfo: Player, otherPlayers: Player[]) => {

				if (!playerInfo) {
					console.log('Error setting player info');
					return;
				}

				this.setState({
					currentPlayer: playerInfo,
					players: otherPlayers ? otherPlayers : [],
					showNameDialog: false
				});
			}
		);
	}

	private addSocketEventListeners = () => {
		this.socket.on('winnerOfRound', ({ guid, score }: { guid: string; score: number; }) => {
			const {
				currentPlayer
			} = this.state;

			// Check if is current player
			if (currentPlayer && currentPlayer.guid === guid) {
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

			const player: Player | undefined = this.state.players.find((p): boolean => p.guid === playerGuid);

			if (!player) {
				console.log('Player not found');
				return;
			}

			this.addGuessToList(player, guess);
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

		this.socket.on('playerDisconnected', (playerGUID: string) => {

			if (!playerGUID) {
				return;
			}

			const player = this.state.players.find(p => p.guid === playerGUID);

			if (!player) {
				return;
			}

			console.log('Player has disconnected: ', player.name);

			this.setState(
				({ players }) => ({
					players: players.filter(p => p.guid !== playerGUID)
				})
			)
		});
	}

	// private setWindowSize = () => {
	// 	// Get the window dimensions (Max width 1200)
	// 	const wWidth: number = window.innerWidth < 1200 ? window.innerWidth : 1200;
	// 	const wHeight: number = window.innerHeight;

	// 	// Get the scaled wHeight
	// 	const canvasHeightFromWidth: number = getCanvasHeightFromWidth(wWidth);

	// 	// Set the state
	// 	this.setState({
	// 		// If the scaled canvas height is bigger than the window
	// 		canvasWidth: canvasHeightFromWidth > wHeight
	// 			// get width from height
	// 			? getCanvasWidthFromHeight(wHeight)
	// 			// Else, use wWidth
	// 			: wWidth
	// 	});
	// }
}

