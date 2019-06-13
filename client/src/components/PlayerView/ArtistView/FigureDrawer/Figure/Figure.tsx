import * as React from 'react';
import { Paper, Button, Zoom, Fade } from '@material-ui/core';
import { imgFolder } from '../../../../../config/imgFolder';
import s from './Figure.module.scss';


export interface FigureProps {
  src: string;
  selected?: boolean;
  onAddImage?: (src: string) => void;
  onDeselect?: () => void;
}

export function Figure({
  src,
  selected,
  onAddImage,
  onDeselect
}: FigureProps): JSX.Element {

  let containerClass: string = s.container;

  const imgCallBack = () => { if (src && onAddImage) onAddImage(`${imgFolder}/${src}`) }
  const deselect = () => { if (onDeselect) onDeselect() }

  return (
    <Paper className={containerClass}>
      <img className={s.img} alt="" src={`${imgFolder}/${src}`} />
      {/* <Fade
        timeout={200}
        in={selected}
        >
        </Fade> */}
      <div className={s.optionButtonWrapper}>
        <Button className={s.optionButton} color="primary" variant="contained" onClick={imgCallBack}> Add </Button>
      </div>

    </Paper>
  );
}
