import React from 'react';
// import s from './App.module.scss';
import { ArtistView } from '../views/ArtistView/ArtistView';
import { GuesserView } from '../views/GuesserView/GuesserCanvas/GuesserView';
import io from 'socket.io-client';
import { PlayerRoles } from '../../models/PlayerRoles';
import { Player } from '../../models/Player';
import { getCanvasHeightFromWidth } from '../../utilities/getCanvasHeightFromWidth';
import { getCanvasWidthFromHeight } from '../../utilities/getCanvasWidthFromHeight';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	TextField,
	DialogActions,
	Button,
	InputAdornment,
	IconButton,
	Icon,
	Snackbar,
	Slide
} from '@material-ui/core';
import { ISharedViewProps } from '../../models/ISharedViewProps';
import { AutoSnackbar } from '../AutoSnackbar/AutoSnackbar';

export interface AppProps {

}

export interface AppState {
	currentPlayer: Player | undefined;
	canvasWidth: number;
	players: Player[];
	showNameDialog: boolean;
	playerName: string;
}

export class App extends React.Component<AppProps, AppState> {

	private socket: SocketIOClient.Socket = io('http://192.168.0.6:3001');

	constructor(props: AppProps) {
		super(props);
		this.state = {
			currentPlayer: undefined,
			canvasWidth: 0,
			players: [],
			showNameDialog: false,
			playerName: ''
		};
	}

	public render() {

		const {
			currentPlayer,
			canvasWidth,
			players,
			showNameDialog
		} = this.state;

		const commonViewProps: ISharedViewProps = {
			ioSocket: this.socket,
			canvasWidth: canvasWidth
		}

		const content: any = (currentPlayer && currentPlayer != null && canvasWidth > 0)
			&& (
				<div>
					<div>
						{
							currentPlayer.role === PlayerRoles.Guesser
								? <GuesserView {...commonViewProps} />
								: <ArtistView {...commonViewProps} />
						}
					</div>
					<div>
						{players.map((p, i) => <div key={`player-${i}`} style={{ color: p.role !== PlayerRoles.Artist ? 'black' : 'red' }}>
							{p.name}
							-
							{p.score}
						</div>)}
					</div>
				</div>
			);

		return (
			<>
				{content}
				<Dialog
					open={showNameDialog}
					onClose={this.closeShowNameDialog}
					aria-labelledby="form-dialog-title"
				>
					<DialogTitle id="form-dialog-title">Enter username</DialogTitle>
					<DialogContent>
						<DialogContentText>
							To subscribe to this website, please enter your email address here. We will send updates
							occasionally.
          	</DialogContentText>
						<TextField
							autoFocus
							id="name"
							label="Player name"
							onChange={e => { if (e && e.target) this.setState({ playerName: e.target.value }); }}
							type="text"
							fullWidth
							value={this.state.playerName}
							onSubmit={this.connectToLobby}
							InputProps={{
								endAdornment: <InputAdornment position="end"> <IconButton color="secondary" onClick={this.setRandomName} > <Icon> casino </Icon> </IconButton> </InputAdornment>
							}}
						/>
					</DialogContent>
					<DialogContent>
						<div style={{
							display: 'flex',
							justifyContent: 'flex-end',
							width: '100%'
						}}>
							<Button variant='contained' size="large" disabled={!this.state.playerName} onClick={this.submitName} color="primary">
								Play!
							</Button>
						</div>
					</DialogContent>
				</Dialog>

				{
					currentPlayer && <AutoSnackbar open={true} message={`Welcome ${currentPlayer.name}!`} />
				}

			</>
		);
	}

	public componentDidMount(): void {

		this.setState({
			showNameDialog: true
		});

		this.setWindowSize();

		this.socket.on('connect', () => {
			this.addSocketEventListeners();
		});
	}

	private connectToLobby = () => {
		this.socket.emit('joinLobby', 'TestLobbyName', this.state.playerName, (playerInfo: Player, otherPlayers: Player[]) => {

			if (!playerInfo || !otherPlayers) {
				console.log('Erorr setting player info');
				return;
			}

			console.log('Other players: ', otherPlayers);

			this.setState({
				currentPlayer: playerInfo,
				players: otherPlayers,
				showNameDialog: false
			});
		});
	}

	private addSocketEventListeners = () => {
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

	private closeShowNameDialog = () => {
		if (!this.state.playerName) {
			return;
		}

		this.setState({
			showNameDialog: false
		});
	}

	private submitName = () => {
		this.connectToLobby();
		this.closeShowNameDialog();
	}

	private setRandomName = () => {
		const prefixes: string[] = [
			'Captain',
			'Sir',
			'Doctor',
			'The Magnificent',
			'A Healthy',
			'The Great'
		];

		const suffixes: string[] = [
			'Aardvark',
			'Brocolli',
			'Cat Lover',
			'Cheese Enthusiast',
			'Cake-Muncher'
		]

		const randomPrefix: string = prefixes[Math.floor(Math.random() * prefixes.length)];
		const randomSuffix: string = suffixes[Math.floor(Math.random() * suffixes.length)];

		this.setState({
			playerName: randomPrefix + ' ' + randomSuffix
		});
	}
}

