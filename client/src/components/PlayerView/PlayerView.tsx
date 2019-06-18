import * as React from 'react';
import { PlayerRoles } from '../../models/enums/PlayerRoles';
import { GuesserView } from './GuesserView/GuesserView';
import { ArtistView } from './ArtistView/ArtistView';
import { ISharedViewProps } from '../../models/interfaces/ISharedViewProps';


export interface PlayerViewProps {
  playerRole: PlayerRoles;
  ioSocket: SocketIOClient.Socket;
  onGuesserGuess: (guess: string) => void;
  roundIsActive: boolean;
}

export function PlayerView({
  ioSocket,
  playerRole,
  onGuesserGuess,
  roundIsActive
}: PlayerViewProps): JSX.Element {


  const commonViewProps: ISharedViewProps = {
    ioSocket
  }

  return playerRole === PlayerRoles.Guesser
    ? <GuesserView roundIsActive={roundIsActive} onGuess={onGuesserGuess} {...commonViewProps} />
    : <ArtistView {...commonViewProps} />;
}
