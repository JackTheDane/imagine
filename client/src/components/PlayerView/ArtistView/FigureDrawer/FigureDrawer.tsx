import * as React from 'react';
import { Drawer, TextField, Grid } from '@material-ui/core';
import s from './FigureDrawer.module.scss';
import { figures as startFigures } from '../../../../config/figures';
import { IFigure } from '../../../../models/interfaces/IFigure';
import { Figure } from './Figure/Figure';

export interface FigureDrawerProps {
  mobileOpen: boolean;
  onAddImage: (src: string) => void;
}

export function FigureDrawer({
  mobileOpen,
  onAddImage
}: FigureDrawerProps): JSX.Element {

  const [filter, setFilter] = React.useState<string>('');
  const [figures, setFigures] = React.useState<IFigure[]>([...startFigures]);

  const onChangeSelection = (figure: IFigure) => {

    if (figure.selected && onAddImage) {
      deselectAll();
    } else {
      setFigures(
        figures.map((f: IFigure): IFigure => ({ ...f, selected: f === figure }))
      );
    }
  }

  /* <Fab color="primary" onClick={() => { console.log('Add image!'); }}>
								<Icon>
									add_to_photos
								</Icon>
							</Fab> */

  const deselectAll = () => {
    setFigures(figures.map((f: IFigure): IFigure => ({ ...f, selected: false })));
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
        <TextField spellCheck={false} className={s.inputRoot} label="Search" onChange={onFilterChange} />
      </div>

      <div className={s.figureContainer}>
        <Grid container spacing={3}>
          {
            figures
              .map(
                (figure: IFigure, i: number): JSX.Element | false => checkForMatch(figure.aliases) && (
                  <Grid key={`fig${i}`} onClick={() => onChangeSelection(figure)} item xs={6}>
                    <Figure
                      onAddImage={onAddImage}
                      src={figure.src}
                      selected={figure.selected}
                      onDeselect={deselectAll}
                    />
                  </Grid>
                )
              )
          }
        </Grid>
      </div>

    </Drawer>
  );
}
