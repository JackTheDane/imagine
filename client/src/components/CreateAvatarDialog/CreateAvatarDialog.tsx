import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, InputAdornment, IconButton, Icon, Button } from '@material-ui/core';

export interface CreateAvatarDialogProps {
  shouldOpen: boolean;
  onPlayerNameSubmit: (name: string) => void;
}

export function CreateAvatarDialog({
  shouldOpen,
  onPlayerNameSubmit
}: CreateAvatarDialogProps): JSX.Element {

  const [playerName, setPlayerName] = React.useState<string>('');

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>): void => {
    if (e && e.target) setPlayerName(e.target.value);
  }

  const onSubmit = () => {
    if (!playerName) return;

    onPlayerNameSubmit(playerName);
  }

  const setRandomName = () => {
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

    setPlayerName(randomPrefix + ' ' + randomSuffix);
  }

  return (
    <Dialog
      open={shouldOpen}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">Enter username</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter your username to enter the lobby
          	</DialogContentText>
        <TextField
          autoFocus
          id="name"
          label="Player name"
          onChange={onChange}
          type="text"
          fullWidth
          value={playerName}
          onSubmit={onSubmit}
          InputProps={{
            endAdornment: <InputAdornment position="end">
              <IconButton
                color="secondary"
                onClick={setRandomName} >
                <Icon> casino </Icon>
              </IconButton>
            </InputAdornment>
          }}
        />
      </DialogContent>
      <DialogContent>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%'
        }}>
          <Button
            variant='contained'
            size="large"
            disabled={!playerName}
            onClick={onSubmit}
            color="primary"
          >
            Play!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
