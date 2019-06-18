import * as React from 'react';
import { Badge, Avatar, Tooltip, makeStyles } from '@material-ui/core';
import s from './PlayerCoin.module.scss';
import { BadgeProps } from '@material-ui/core/Badge';

const coinStyles = makeStyles(theme => ({
  artistPlayerOutline: {
    boxShadow: `0 0 1px 3px ${theme.palette.primary.light}`
  }
}))

export interface PlayerCoinProps {
  name: string;
  imgSrc: string;
  score: number;
  isArtist?: boolean;
  avatarSize?: 'normal' | 'large';
  toolTipPlacement?: "left" | "bottom-end" | "bottom-start" | "bottom" | "left-end" | "left-start" | "right-end" | "right-start" | "right" | "top-end" | "top-start" | "top" | undefined;
}

export function PlayerCoin({
  imgSrc,
  name,
  score,
  avatarSize,
  toolTipPlacement,
  isArtist
}: PlayerCoinProps): JSX.Element {

  const classes = coinStyles();

  const badgeProps: Partial<BadgeProps> = {
    color: 'secondary',
    classes: { root: s.badgeRoot, badge: s.badge },
    badgeContent: score
  }

  let avatarClasses: string = avatarSize === 'large' ? s.avatarBig : '';

  if (isArtist) {
    avatarClasses += ` ${classes.artistPlayerOutline}`
  }

  return (
    <Tooltip title={name} placement={toolTipPlacement ? toolTipPlacement : 'left'}>
      <Badge {...badgeProps}>
        <Avatar className={avatarClasses} alt={name} src={imgSrc} />
      </Badge>
    </Tooltip>
  );
}
