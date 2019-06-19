import * as React from 'react';
import { Drawer, TextField, Hidden, Tabs, Tab, Icon, InputAdornment, IconButton, SwipeableDrawer } from '@material-ui/core';
import s from './FigureDrawer.module.scss';
import { figures } from '../../../../config/figures';
import { IFigure } from '../../../../models/interfaces/IFigure';
import { FigureGrid } from './FigureGrid/FigureGrid';
import { imgFolder } from '../../../../config/imgFolder';
import { TextFieldProps } from '@material-ui/core/TextField';

export interface FigureDrawerProps {
  mobileOpen: boolean;
  onMobileOpen: () => void;
  onMobileClose: () => void;
  onAddImage: (src: string) => void;
}

export function FigureDrawer({
  mobileOpen,
  onAddImage,
  onMobileOpen,
  onMobileClose
}: FigureDrawerProps): JSX.Element {

  const [filter, setFilter] = React.useState<string>('');
  const [tabIndex, setTabIndex] = React.useState<number>(0);

  const [prevUsedFigures, setPrevUsedFigures] = React.useState<IFigure[]>([]);

  const addNewFigure = (figure: IFigure) => {
    setPrevUsedFigures([...prevUsedFigures.filter(f => f.src !== figure.src), { ...figure }]);

    addFigure(figure);
  }

  const addFigure = (figure: IFigure) => {
    if (!figure) return;

    console.log(figure);

    onAddImage(`${imgFolder}/${figure.src}`);
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
  // let figuresToUse: IFigure[];
  // let addImageCallback: (figure: IFigure) => void;

  let tabContent: JSX.Element;

  switch (tabIndex) {
    // Previously used
    case 1: tabContent = <FigureGrid figures={prevUsedFigures.filter(f => checkForMatch(f.aliases))} onAddFigure={addFigure} />
      break;

    // Default case, main "All tab"
    default: tabContent = <FigureGrid figures={figures.filter(f => checkForMatch(f.aliases))} onAddFigure={addNewFigure} />
      break;
  }

  const textFieldProps: TextFieldProps = {
    className: s.inputRoot,
    label: 'Search',
    onChange: onFilterChange,
    value: filter
  }

  if (filter) {
    textFieldProps.InputProps = {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            color="default"
            onClick={() => setFilter('')} >
            <Icon> clear </Icon>
          </IconButton>
        </InputAdornment>
      )
    }
  }

  const content: JSX.Element = (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <Tabs
          value={tabIndex}
          onChange={onTabsChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All" />
          <Tab icon={<Icon>history</Icon>} />
        </Tabs>


        <div style={{ backgroundColor: '#F5F5F5', flexGrow: 1, overflowY: 'auto' }}>
          <div style={{ padding: '10px 20px', boxSizing: 'border-box' }}>
            <TextField
              {...textFieldProps}
            />
          </div>
          {tabContent}
        </div>
      </div>
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
        <SwipeableDrawer
          variant="temporary"
          className={s.permanentDrawer}
          classes={{
            paper: s.permanentDrawerPaper,
          }}
          open={mobileOpen}
          onOpen={onMobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true
          }}
        >
          {content}
        </SwipeableDrawer>
      </Hidden>
    </>
  );
}
