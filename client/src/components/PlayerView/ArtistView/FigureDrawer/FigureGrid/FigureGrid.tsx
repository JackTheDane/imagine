import * as React from 'react';
import { IFigure } from '../../../../../models/interfaces/IFigure';
import { Grid } from '@material-ui/core';
import { Figure } from '../Figure/Figure';
import s from './FigureGrid.module.scss';


export interface FigureGridProps {
  figures: IFigure[];
  onAddFigure: (figure: IFigure) => void;
}

export function FigureGrid({
  figures,
  onAddFigure
}: FigureGridProps): JSX.Element {

  const [selectedFigure, setSelectedFigure] = React.useState<IFigure | null>(null);

  const deselectFigure = () => {
    console.log('Woop');
    setSelectedFigure(null);
  }

  return (
    <div className={s.figureContainer}>
      <Grid container className={s.gridRoot} spacing={3}>
        {
          figures
            .map(
              (figure: IFigure, i: number): JSX.Element => (
                <Grid key={`fig${i}`} onClick={() => setSelectedFigure(figure)} item xs={6}>
                  <Figure
                    onAddImage={() => onAddFigure(figure)}
                    src={figure.src}
                    selected={figure === selectedFigure}
                    onDeselect={deselectFigure}
                  />
                </Grid>
              )
            )
        }
      </Grid>
    </div>
  )
}
