import * as React from 'react';
import { PlayerRoles } from '../../models/enums/PlayerRoles';
import { GuesserView } from './GuesserView/GuesserView';
import { ArtistView } from './ArtistView/ArtistView';
import { ISharedViewProps } from '../../models/interfaces/ISharedViewProps';


export interface PlayerViewProps {
  playerRole: PlayerRoles;
  ioSocket: SocketIOClient.Socket;
  onGuesserGuess: (guess: string) => void;
}

export function PlayerView({
  ioSocket,
  playerRole,
  onGuesserGuess
}: PlayerViewProps): JSX.Element {


  const commonViewProps: ISharedViewProps = {
    ioSocket,
    canvasWidth: 600
  }

  return playerRole === PlayerRoles.Guesser
    ? <GuesserView onGuess={onGuesserGuess} {...commonViewProps} />
    : <ArtistView {...commonViewProps} />;
}
