import * as React from 'react';

import { Slide, Snackbar, SnackbarContent, makeStyles, Icon } from "@material-ui/core";
import { SnackbarProps } from '@material-ui/core/Snackbar';
import { green } from '@material-ui/core/colors';

export interface AutoSnackbarProps extends Partial<SnackbarProps> {
  variant?: 'success';
  iconName?: string;
}

export const SlideTransition = (direction: 'up' | 'down', props: any): JSX.Element => <Slide {...props} direction={direction} />;

const snackbarStyles = makeStyles(theme => ({
  success: {
    backgroundColor: green[600]
  },
  icon: {
    fontSize: 20,
    opacity: 0.9,
    marginRight: theme.spacing(1),
  },
  message: {
    display: 'flex',
    alignItems: 'center',
  },
}))

export function AutoSnackbar({
  open,
  message,
  variant,
  iconName,
  anchorOrigin,
  ...rest
}: AutoSnackbarProps) {

  const classes = snackbarStyles();

  const [openState, setOpenState] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (message) {
      setOpenState(true);
    }
  }, [message]);

  React.useEffect(() => {
    setOpenState(open || false);
  }, [open]);

  const handleClose = () => {
    setOpenState(false);
  }

  const contentClassName: string = variant ? classes[variant] : '';

  const snackbarDirection: 'up' | 'down' = anchorOrigin && anchorOrigin.vertical === 'top'
    ? 'down'
    : 'up';

  return (
    <Snackbar
      open={openState}
      onClose={handleClose}
      message={message}
      anchorOrigin={anchorOrigin}
      {...rest}
      TransitionComponent={(props: any) => SlideTransition(snackbarDirection, props)}
      autoHideDuration={2500}
    >
      <SnackbarContent
        className={contentClassName}
        message={
          <span className={classes.message}>
            {iconName && <Icon className={classes.icon}> {iconName} </Icon>}
            {message}
          </span>
        }
      >

      </SnackbarContent>
    </Snackbar>
  )
}
