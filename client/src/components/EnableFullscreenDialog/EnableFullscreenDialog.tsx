import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, Button } from '@material-ui/core';
import { openFullscreen } from '../../utils/fullscreen';

export interface EnableFullscreenDialogProps { }

export function EnableFullscreenDialog(): JSX.Element {

  const [shouldOpen, setShouldOpen] = React.useState<boolean>(window.innerWidth < 1200);

  const enableFullscreen = () => {
    openFullscreen();
    closeDialog();
  }

  const closeDialog = () => {
    setShouldOpen(false);
  }

  return (
    <Dialog
      open={shouldOpen}
      aria-labelledby="form-fs-title"
      style={{
        width: '100%'
      }}
    >
      <DialogTitle id="form-fs-title">Enable Fullscreen?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          For smaller screens, this game is best played in fullscreen mode.
        </DialogContentText>
      </DialogContent>
      <DialogContent>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          <div style={{ marginRight: 10 }}>
            <Button
              variant='contained'
              size="large"
              onClick={closeDialog}
            >
              No thanks
            </Button>
          </div>
          <div style={{ display: 'flex' }}>
            <Button
              variant='contained'
              size="large"
              onClick={enableFullscreen}
              color="primary"
            >
              Enable
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
