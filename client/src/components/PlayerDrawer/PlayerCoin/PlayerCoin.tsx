import * as React from 'react';
import { Badge, Avatar, Tooltip } from '@material-ui/core';
import s from './PlayerCoin.module.scss';

export interface PlayerCoinProps {
  name: string;
  imgSrc: string;
  score: number;
  avatarSize?: 'normal' | 'large';
  toolTipPlacement?: "left" | "bottom-end" | "bottom-start" | "bottom" | "left-end" | "left-start" | "right-end" | "right-start" | "right" | "top-end" | "top-start" | "top" | undefined;
}

export function PlayerCoin({
  imgSrc,
  name,
  score,
  avatarSize,
  toolTipPlacement
}: PlayerCoinProps): JSX.Element {

  if (avatarSize === 'large') {

  }

  return (
    <Tooltip title={name} placement={toolTipPlacement ? toolTipPlacement : 'left'}>
      <Badge color="secondary" classes={{ root: s.badgeRoot, badge: s.badge }} badgeContent={score} >
        <Avatar className={avatarSize === 'large' ? s.avatarBig : ''} alt={name} src={imgSrc} />
      </Badge>
    </Tooltip>
  );
}
