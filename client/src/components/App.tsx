import React from 'react';
// import s from './App.module.scss';
import io from 'socket.io-client';
import { PlayerRoles } from '../models/enums/PlayerRoles';
import { Player } from '../models/interfaces/Player';
import { AutoSnackbar } from './AutoSnackbar/AutoSnackbar';
import { IMessage } from '../models/interfaces/IMessage';
import { PlayerDrawer } from './PlayerDrawer/PlayerDrawer';
import { CreateAvatarDialog } from './CreateAvatarDialog/CreateAvatarDialog';
import { PlayerView } from './PlayerView/PlayerView';
import { webSocketPort } from '../config/webSocketPort';
import { MessageTypes } from '../models/enums/MessageTypes';
import { Dialog, DialogTitle, DialogContent, DialogContentText } from '@material-ui/core';

export interface AppState {
	currentPlayer: Player | undefined;
	players: Player[];
	showNameDialog: boolean;
	playerName: string;
	userGuesses: IMessage[];
	playerWonMessage: string | JSX.Element;
	artistIsChoosing: boolean;
}

export class App extends React.Component<{}, AppState> {

	private socket: SocketIOClient.Socket = io(webSocketPort);

	constructor(props: {}) {
		super(props);
		this.state = {
			currentPlayer: undefined,
			players: [],
			showNameDialog: true,
			playerName: '',
			userGuesses: [],
			playerWonMessage: '',
			artistIsChoosing: true
		};
	}

	public render() {

		const {
			currentPlayer,
			showNameDialog,
			userGuesses,
			players,
			playerWonMessage,
			artistIsChoosing
		} = this.state;

		if (!currentPlayer) {
			return <CreateAvatarDialog shouldOpen={showNameDialog} onPlayerNameSubmit={this.submitName} />;
		}

		const artistPlayer: Player | undefined = currentPlayer.role === PlayerRoles.Artist
			? currentPlayer
			: players.find(p => p.role === PlayerRoles.Artist)

		const artistChoosing: boolean = artistIsChoosing && artistPlayer !== currentPlayer;

		console.log(artistChoosing);

		return (
			<>
				<div style={{ display: 'flex', height: '100vh' }} >
					<div style={{ flexGrow: 1 }}>
						<PlayerView
							roundIsActive={!artistChoosing}
							ioSocket={this.socket}
							onGuesserGuess={this.onGuesserGuess}
							playerRole={currentPlayer.role}
						/>
					</div>
					<PlayerDrawer currentPlayer={currentPlayer} players={players} userGuesses={userGuesses} />
				</div>

				<AutoSnackbar
					open={true}
					message={`Welcome ${currentPlayer.name}!`}
					iconName="👋"
				/>
				<AutoSnackbar
					open={playerWonMessage != ''}
					message={playerWonMessage}
					variant="success"
					iconName="🎉"
				/>{artistPlayer && artistPlayer.name}

				<Dialog open={artistChoosing}>
					<DialogTitle>
						{
							artistPlayer
								? `${artistPlayer.name}'s turn`
								: 'New turn'
						}
					</DialogTitle>
					<DialogContent>
						<DialogContentText>
							A new subject is being chosen.
						</DialogContentText>
					</DialogContent>
				</Dialog>

				{artistChoosing && <h1>Not yet</h1>}
			</>
		);
	}

	public componentDidMount(): void {
		this.socket.on('connect', () => {
			this.addSocketEventListeners();
		});
	}

	// ---- Game Interactions ---- //

	private addGuessToList = (
		player: string | Player,
		guess: string,
		type?: MessageTypes
	) => {

		// Check if the passed "player" param is a string, indicating a GUID
		const playerObject: Player | undefined = typeof player === 'string'
			? this.state.players.find((p): boolean => p.guid === player)
			: player;

		if (!playerObject) {
			console.log('Could not register guess: ', player, guess);
			return;
		}

		const newGuess: IMessage = {
			player: playerObject,
			text: guess
		}

		// add type if one was found
		if (type != null) {
			newGuess.type = type;
		}

		this.setState(
			({ userGuesses }) => ({
				userGuesses: [...userGuesses, newGuess]
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

		this.socket.on('newSubject', () => {
			this.setState({
				artistIsChoosing: false
			});
		});

		this.socket.on('winnerOfRound', ({ guid, score, guess }: { guid: string; guess: string; score: number; }) => {
			const {
				currentPlayer,
				players
			} = this.state;

			const isCurrentPlayer: boolean = currentPlayer != null && currentPlayer.guid === guid;

			// Check if is current player
			if (currentPlayer && isCurrentPlayer) {
				// Set the new score
				this.setState({
					currentPlayer: {
						...currentPlayer,
						score
					},
					players: players.map(p => {

						const returnPlayer: Player = { ...p };

						if (returnPlayer.role === PlayerRoles.Artist) {
							returnPlayer.score++;
						}

						return returnPlayer;
					}),
					playerWonMessage: 'You won this round!'
				});

				return;
			}

			// The current player was not the winner of the round

			let artistPlayerFound: boolean = false;
			let playerName: string = 'A player';

			// Else, player is not current player
			this.setState(
				({ players }) => ({
					players: players.map((p: Player): Player => {
						if (p.guid === guid) {
							p.score = score;

							playerName = p.name;

						} else if (p.role === PlayerRoles.Artist) {
							// Increment the score if the player was the Artist
							p.score++;
							artistPlayerFound = true;
						}

						return p;
					}),
					playerWonMessage: <div style={{ textAlign: 'center' }}>
						<div>
							{playerName} has won the round!
						</div>
						<div>
							Subject was: <b style={{ textTransform: 'capitalize' }} > {guess} </b>
						</div>
					</div>
				})
			)

			// If the Artist was not found, then the current player is Artist. Therefore, increment player score
			if (currentPlayer && !artistPlayerFound) {
				this.setState({
					currentPlayer: { ...currentPlayer, score: currentPlayer.score + 1 }
				});
			}
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

			this.addGuessToList(playerGuid, guess);
		});

		this.socket.on('newArtist', (newArtistGuid: string) => {
			const {
				currentPlayer
			} = this.state;

			if (!newArtistGuid || !currentPlayer) {
				return;
			}

			const isArtist: boolean = currentPlayer.guid === newArtistGuid;

			if (isArtist) {
				this.setState({
					currentPlayer: {
						...currentPlayer,
						role: PlayerRoles.Artist
					}
				});
			} else { // If the current player was the Artist, set to be Guesser
				this.setState({
					currentPlayer: {
						...currentPlayer,
						role: PlayerRoles.Guesser
					},
					artistIsChoosing: true
				}
				);
			}

			// Set all other players to be the guesser
			this.setState(
				({ players }) => ({
					players: players.map(
						(p: Player): Player => ({
							...p,
							role: p.guid !== newArtistGuid ? PlayerRoles.Guesser : PlayerRoles.Artist
						})
					),
					artistIsChoosing: true
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

}

