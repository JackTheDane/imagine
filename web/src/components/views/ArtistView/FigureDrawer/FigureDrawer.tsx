import * as React from 'react';
import { Drawer, TextField, Grid } from '@material-ui/core';
import s from './FigureDrawer.module.scss';
import { figures as startFigures } from '../../../../config/figures';
import { IFigure } from '../../../../models/IFigure';
import { Figure } from './Figure/Figure';

export interface FigureDrawerProps {
  mobileOpen: boolean;
  onAddImage: (src: string) => void;
}

export function FigureDrawer({ }: FigureDrawerProps): JSX.Element {

  const [filter, setFilter] = React.useState<string>('');
  const [figures, setFigures] = React.useState<IFigure[]>([...startFigures]);

  const onChangeSelection = (figure: IFigure) => {
    setFigures(
      figures.map((f: IFigure): IFigure => f === figure ? { ...f, selected: !f.selected } : f)
    );
  }

  const onFilterChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    if (!e || !e.target) {
      return;
    }

    setFilter(e.target.value.toLowerCase());
  }

  const checkForMatch = (aliases: string[]): boolean => aliases.some((alias: string): boolean => alias.indexOf(filter) === 0);


  return (
    <Drawer
      variant="permanent"
      className={s.permanentDrawer}
      classes={{
        paper: s.permanentDrawerPaper,
      }}
      open={true}
    >

      <div style={{ padding: 20, boxSizing: 'border-box' }}>
        <TextField className={s.inputRoot} label="Search" onChange={onFilterChange} />
      </div>

      <div className={s.figureContainer}>
        <Grid container spacing={3}>
          {
            figures
              .map(
                (figure: IFigure): JSX.Element | false => checkForMatch(figure.aliases) && (
                  <Grid onClick={() => onChangeSelection(figure)} item xs={6}>
                    <Figure src={figure.src} selected={figure.selected} />
                  </Grid>
                )
              )
          }
        </Grid>
      </div>

    </Drawer>
  );
}
