import * as React from 'react';
import { Button, Icon } from '@material-ui/core';
import { keys } from './keys';
import s from './ScreenKeyboard.module.scss';

export interface ScreenKeyboardProps {
  onKeyClick: (key: string) => void;
  onDeleteClick: () => void;
  onSubmit: () => void;
  disableSubmit: boolean;
}

export function ScreenKeyboard({
  onDeleteClick,
  onKeyClick,
  disableSubmit,
  onSubmit
}: ScreenKeyboardProps): JSX.Element {

  const generateKey = (key: string): JSX.Element => (
    <div className={s.buttonWrapper}>
      <Button style={{ textTransform: 'lowercase' }} onClick={() => onKeyClick(key)} className={s.keyButton}> {key} </Button>
    </div>
  );

  React.useEffect(() => {

  }, []);

  return (
    <div className={s.root}>
      {keys.map(generateKey)}

      <div className={`${s.buttonWrapper} ${s.deleteButton}`}>
        <Button onClick={onDeleteClick} className={s.keyButton}>
          <Icon>
            backspace
          </Icon>
        </Button>
      </div>

      <div className={`${s.buttonWrapper} ${s.submitButton}`}>
        <Button disabled={disableSubmit} onClick={onSubmit} className={s.keyButton} variant="contained" color="primary">
          <Icon>
            send
          </Icon>
        </Button>
      </div>
    </div>
  );
}
