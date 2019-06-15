import * as React from 'react';
import { Grid, Button, Icon } from '@material-ui/core';
import { keys } from './keys';
import s from './ScreenKeyboard.module.scss';

export interface ScreenKeyboardProps {
  onKeyClick: (key: string) => void;
  onDeleteClick: () => void;
}

export function ScreenKeyboard({
  onDeleteClick,
  onKeyClick
}: ScreenKeyboardProps): JSX.Element {

  // const first2Keys: string[] = keys.slice(0, 2);
  // const restKeys: string[] = keys.slice(2);

  const genereateKey = (key: string): JSX.Element => (
    <Grid item xs={3}>
      <Button onClick={() => onKeyClick(key)} className={s.keyButton} variant="outlined"> {key} </Button>
    </Grid>
  );

  return (
    <Grid container spacing={1}>
      {keys.map(genereateKey)}
      <Grid item xs={6}>
        <Button onClick={onDeleteClick} className={s.keyButton} variant="outlined">
          <Icon style={{ marginRight: 10, fontSize: '1.4em' }}>
            backspace
          </Icon>
          Delete
        </Button>
      </Grid>
    </Grid>
  );
}
