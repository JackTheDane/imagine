import * as React from 'react';

import { Slide, Snackbar } from "@material-ui/core";

export interface AutoSnackbarProps {
  message: string;
  open: boolean;
}

export const SlideTransition = (props: any): JSX.Element => <Slide {...props} direction="up" />;

export function AutoSnackbar({ message, open }: AutoSnackbarProps) {

  const [openState, setOpenState] = React.useState<boolean>(false);

  React.useEffect(() => {
    setOpenState(open);
  }, [open]);

  const handleClose = () => {
    setOpenState(false);
  }

  return (
    <Snackbar
      open={openState}
      TransitionComponent={SlideTransition}
      message={message}
      autoHideDuration={2500}
      onClose={handleClose}
    />
  )
}
