import * as React from 'react';
import { Paper, Button, Zoom, Fade } from '@material-ui/core';
import { imgFolder } from '../../../../../config/imgFolder';
import s from './Figure.module.scss';
import { IFigure } from '../../../../../models/interfaces/IFigure';


export interface FigureProps {
  figure: IFigure;
  selected?: boolean;
  onAddImage?: (figure: IFigure) => void;
  onDeselect?: () => void;
}

export function Figure({
  figure,
  selected,
  onAddImage,
  // onDeselect
}: FigureProps): JSX.Element {

  let containerClass: string = s.container;

  const imgCallBack = () => { if (figure.src && onAddImage) onAddImage(figure) }

  return (
    <Paper className={containerClass}>
      <img className={s.img} alt="" src={`${imgFolder}/${figure.src}`} />
      <Fade
        timeout={200}
        in={selected}
      >
        <div className={s.optionButtonWrapper}>
          <Zoom
            timeout={200}
            in={selected}
          >
            <Button className={s.optionButton} color="primary" variant="contained" onClick={imgCallBack}> Add </Button>
          </Zoom>
        </div>
      </Fade>

    </Paper>
  );
}
