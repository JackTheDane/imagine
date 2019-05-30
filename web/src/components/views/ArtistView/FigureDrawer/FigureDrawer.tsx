import * as React from 'react';
import { Drawer } from '@material-ui/core';
import s from './FigureDrawer.module.scss';

export interface FigureDrawerProps {
  mobileOpen: boolean;
  onAddImage: (src: string) => void;
}

export function FigureDrawer({ }: FigureDrawerProps): JSX.Element {


  return (
    <Drawer
      variant="permanent"
      className={s.permanentDrawer}
      classes={{
        paper: s.permanentDrawerPaper,
      }}
      open={true}
    >



    </Drawer>
  );
}
