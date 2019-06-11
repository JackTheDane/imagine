import * as React from 'react';
import { PlayerRoles } from '../../models/enums/PlayerRoles';


export interface PlayerViewProps {
  playerRole: PlayerRoles;
  iosocket: SocketIOClient.Socket;
}

export function PlayerView({

}: PlayerViewProps): JSX.Element {
  return (

  );
}
