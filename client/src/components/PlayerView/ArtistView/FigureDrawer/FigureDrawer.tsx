import * as React from 'react';
import { Drawer, TextField, Hidden, Tabs, Tab } from '@material-ui/core';
import s from './FigureDrawer.module.scss';
import { figures as startFigures } from '../../../../config/figures';
import { IFigure } from '../../../../models/interfaces/IFigure';
import SwipeableViews from 'react-swipeable-views';
import { FigureGrid } from './FigureGrid/FigureGrid';

export interface FigureDrawerProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onAddImage: (src: string) => void;
}

export function FigureDrawer({
  mobileOpen,
  onAddImage,
  onMobileClose
}: FigureDrawerProps): JSX.Element {

  const [filter, setFilter] = React.useState<string>('');
  const [figures, setFigures] = React.useState<IFigure[]>([...startFigures]);
  const [tabIndex, setTabIndex] = React.useState<number>(0);

  const [prevUsedFigures, setPrevUsedFigures] = React.useState<IFigure[]>([]);

  // const drawerWidth: number = 240;

  // const useStyles = makeStyles((theme: any) => ({
  //   root: {
  //     display: 'flex',
  //   },
  //   drawer: {
  //     [theme.breakpoints.up('sm')]: {
  //       width: drawerWidth,
  //       flexShrink: 0,
  //     },
  //   },
  //   appBar: {
  //     marginLeft: drawerWidth,
  //     [theme.breakpoints.up('sm')]: {
  //       width: `calc(100% - ${drawerWidth}px)`,
  //     },
  //   },
  //   menuButton: {
  //     marginRight: theme.spacing(2),
  //     [theme.breakpoints.up('sm')]: {
  //       display: 'none',
  //     },
  //   },
  //   toolbar: theme.mixins.toolbar,
  //   drawerPaper: {
  //     width: drawerWidth,
  //   },
  //   content: {
  //     flexGrow: 1,
  //     padding: theme.spacing(3),
  //   },
  // }));

  const addNewFigure = (figure: IFigure) => {
    setPrevUsedFigures([...prevUsedFigures.filter(f => f.src !== figure.src), { ...figure }]);

    addFigure(figure);
  }

  const addFigure = (figure: IFigure) => {
    if (!figure) return;

    onAddImage(figure.src);
  }

  const checkForMatch = (aliases: string[]): boolean => aliases.some((alias: string): boolean => alias.indexOf(filter) === 0);

  // ---- Callbacks ---- //

  const onFilterChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    if (!e || !e.target) {
      return;
    }

    setFilter(e.target.value.toLowerCase());
  }

  const onTabsChange = (e: any, newIndex: number) => {
    setTabIndex(newIndex);
  }

  // ---- Content ---- //

  const content: JSX.Element = (
    <>
      <div style={{ padding: 20, boxSizing: 'border-box' }}>
        <TextField spellCheck={false} className={s.inputRoot} label="Search" onChange={onFilterChange} />
      </div>

      <Tabs
        value={tabIndex}
        onChange={onTabsChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab label="All" />
        <Tab label="Previous" />
      </Tabs>

      <SwipeableViews
        index={tabIndex}
        onChangeIndex={setTabIndex}
      >
        <FigureGrid figures={figures.filter(f => checkForMatch(f.aliases))} onAddFigure={addNewFigure} />
        <FigureGrid figures={prevUsedFigures.filter(f => checkForMatch(f.aliases))} onAddFigure={addFigure} />
      </SwipeableViews>
    </>
  );

  return (
    <>
      {/* Desktop version */}
      <Hidden smDown implementation="css">
        <Drawer
          variant="permanent"
          className={s.permanentDrawer}
          classes={{
            paper: s.permanentDrawerPaper,
          }}
          open={true}
        >
          {content}
        </Drawer>
      </Hidden>

      {/* Mobile version */}
      <Hidden mdUp implementation="css">
        <Drawer
          variant="temporary"
          className={s.permanentDrawer}
          classes={{
            paper: s.permanentDrawerPaper,
          }}
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true
          }}
        >
          {content}
        </Drawer>
      </Hidden>
    </>
  );
}
