import * as React from 'react';
import { Icon, Zoom, IconButton } from '@material-ui/core';

export interface ArtistToolbarProps {
  buttonProps: {
    iconName: string;
    isDisabled?: boolean;
    onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    shouldHide?: boolean;
    color?: string;
  }[];
}

export function ArtistToolbar({
  buttonProps
}: ArtistToolbarProps): JSX.Element {

  return (
    <div style={{ display: 'flex' }}>

      {buttonProps.map(({
        iconName,
        isDisabled,
        onClick,
        shouldHide,
        color
      }, i: number) => (
          <Zoom
            timeout={50}
            in={!shouldHide}
            key={`abtn${i}`}
          >
            <IconButton
              color="default"
              disabled={isDisabled}
              onClick={onClick}
              aria-label={iconName}
            >
              <Icon
                style={{
                  color: color ? color : 'inherit'
                }}
                fontSize="small"
              >
                {iconName}
              </Icon>
            </IconButton>
          </Zoom>
        ))}

    </div>
  );
}
