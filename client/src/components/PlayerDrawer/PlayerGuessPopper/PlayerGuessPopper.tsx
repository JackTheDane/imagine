import * as React from 'react';
import { IMessage } from '../../../models/interfaces/IMessage';
import s from './PlayerGuessPopper.module.scss';
import { MessageTypes } from '../../../models/enums/MessageTypes';

export interface PlayerGuessPopperProps {
  userGuess: IMessage;
}

export function PlayerGuessPopper({
  userGuess
}: PlayerGuessPopperProps): JSX.Element {



  const [guessKey, setGuessKey] = React.useState<number>(0);

  React.useEffect(() => {

    // Set a random key to trigger rerender
    setGuessKey(Date.now());

  }, [userGuess]);

  let className: string = s.root;

  if (userGuess.type === MessageTypes.success) {
    className += ` ${s.success}`;
  }

  return (
    <div className={className} key={guessKey}>
      {userGuess.text}
    </div>
  );
}
