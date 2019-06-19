import * as React from 'react';
import { Player } from '../../models/interfaces/Player';
import { Avatar, List, ListItem, ListItemAvatar, Divider, ListItemText, Hidden, withWidth, SwipeableDrawer } from '@material-ui/core';
import { IMessage } from '../../models/interfaces/IMessage';
import s from './PlayerDrawer.module.scss';
import { PlayerCoin } from './PlayerCoin/PlayerCoin';
import { PlayerGuessPopper } from './PlayerGuessPopper/PlayerGuessPopper';
import { PlayerRoles } from '../../models/enums/PlayerRoles';
import { MessageTypes } from '../../models/enums/MessageTypes';
import { green } from '@material-ui/core/colors';

const genericPlayerImg: string = 'data:image/png;base64,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';

export interface PlayerDrawerProps {
  players: Player[];
  userGuesses: IMessage[];
  currentPlayer: Player;
}


function InnerPlayerDrawer({
  players,
  userGuesses,
  currentPlayer
}: PlayerDrawerProps): JSX.Element {

  const [showLog, setShowLog] = React.useState<boolean>(false);

  const toggleLog = () => {
    setShowLog(!showLog);
  }

  const closeLog = () => {
    setShowLog(false);
  }

  const openLog = () => {
    setShowLog(true);
  }

  const filteredUserGuesses: IMessage[] = [...userGuesses].filter(m => m.player.guid !== currentPlayer.guid);

  const sortPlayer = (a: Player, b: Player): number => b.score - a.score;

  const scoreSortedPlayers: Player[] = [...players].sort(sortPlayer);

  const generateNormalPlayerCoin = (player: Player, idx: number = 0): JSX.Element => {
    const lastPlayerGuess: IMessage | undefined = userGuesses.slice(0).reverse().find(guess => guess.player === player);

    return (
      <div className={s.playerCoin} key={`pc${idx}`}>
        {
          lastPlayerGuess && <PlayerGuessPopper userGuess={lastPlayerGuess} />
        }
        <PlayerCoin
          imgSrc={genericPlayerImg}
          name={player.name}
          score={player.score}
          isArtist={player.role === PlayerRoles.Artist}
        />
      </div>
    )
  }

  return (
    <div className={s.container}>
      <div className={s.playerCoinContainer} onClick={toggleLog}>

        <div style={{ marginBottom: 20 }}>
          <PlayerCoin
            imgSrc="https://material-ui.com/static/images/avatar/1.jpg"
            name={currentPlayer.name}
            score={currentPlayer.score}
            isArtist={currentPlayer.role === PlayerRoles.Artist}
            avatarSize="large"
          />
        </div>

        {/* Mobile view */}
        <Hidden smUp>
          {
            filteredUserGuesses.length > 0
              ? generateNormalPlayerCoin(filteredUserGuesses[filteredUserGuesses.length - 1].player)
              : scoreSortedPlayers.length > 0 && generateNormalPlayerCoin(scoreSortedPlayers[scoreSortedPlayers.length - 1])
          }
        </Hidden>

        {/* Desktop view */}
        <Hidden xsDown>
          {
            scoreSortedPlayers.map(generateNormalPlayerCoin)
          }
        </Hidden>

      </div>

      <SwipeableDrawer
        variant="temporary"
        anchor="right"
        className={s.permanentDrawer}
        classes={{
          paper: s.permanentDrawerPaper,
        }}
        open={showLog}
        onOpen={openLog}
        onClose={closeLog}
      >

        <div className={s.drawerPlayerCoins}>
          <div style={{ marginRight: 20 }} >
            <PlayerCoin
              imgSrc="https://material-ui.com/static/images/avatar/1.jpg"
              name={currentPlayer.name}
              score={currentPlayer.score}
              avatarSize="large"
              toolTipPlacement="bottom"
            />
          </div>
          {scoreSortedPlayers.map((p, i: number) => (
            <div
              key={`ssp${i}`}
              className={s.drawerPlayerCoin}
            >
              <PlayerCoin
                imgSrc={genericPlayerImg}
                name={p.name}
                score={p.score}
                toolTipPlacement="bottom"
              />
            </div>
          ))}
        </div>

        <List>
          {userGuesses.map(
            ({ player, text, type }, i: number) => (
              <div key={`li${i}`} style={{ color: type === MessageTypes.success ? green[600] : undefined }}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar alt={player.name} src="data:image/png;base64,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" />
                  </ListItemAvatar>
                  <ListItemText
                    primary={text}
                    secondary={player ? player.name : ''}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </div>
            )
          )}
        </List>
      </SwipeableDrawer>
    </div>
  );
}


export const PlayerDrawer = withWidth()(InnerPlayerDrawer);
