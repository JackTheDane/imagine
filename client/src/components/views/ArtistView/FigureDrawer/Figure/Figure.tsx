import * as React from 'react';
import { makeStyles } from '@material-ui/styles';
import { Paper } from '@material-ui/core';
import { imgFolder } from '../../../../../config/imgFolder';
import s from './Figure.module.scss';


export interface FigureProps {
  src: string;
  selected?: boolean;
}

// const useStyles = makeStyles( theme => ({
//   root: {
//     padding: theme.spacing()
//   }
// }));

export function Figure({ src, selected }: FigureProps): JSX.Element {

  let containerClass: string = s.container;

  if (selected) {
    containerClass += ` ${s.selected}`;
  }

  return (
    <Paper className={containerClass}>
      <img className={s.img} src={`${imgFolder}/${src}`} />
    </Paper>
  );
}
