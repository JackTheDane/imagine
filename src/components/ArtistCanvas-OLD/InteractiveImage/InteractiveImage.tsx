import * as React from 'react';
import interact from 'interactjs';

export interface InteractiveImageProps {
  src: string;
}

export function InteractiveImage({ src }: InteractiveImageProps) {

  const [shouldScale, setScale] = React.useState<boolean>(false);
  const [mouseIsDown, setMouseDown] = React.useState<boolean>(false);
  const [posX, setposX] = React.useState<number>(100);
  const [posY, setposY] = React.useState<number>(100);


  const refFromUseRef = React.useRef<HTMLImageElement | string>();

  const setRef = (node: string | HTMLImageElement | null) => {
    if (node && !refFromUseRef.current) {
      refFromUseRef.current = node;
    }
  }

  const init = () => {
    if (!refFromUseRef.current) {
      return;
    }

    interact(refFromUseRef.current)
      .draggable({
        onmove: onMove
      });
  }

  const onMove = (e: Interact.InteractEvent) => {
    if (e) {
      const {
        dx,
        dy
      } = e;

      console.log({
        posX,
        posY
      });

      if (dx) {
        setposX(posX + dx);
      }

      if (dy) {
        setposY(posY + dy);
      }
    }
  }

  React.useEffect(() => {
    init();
  }, [])

  let transformString: string[] = [`translate( ${posX}px, ${posY}px )`];

  if (shouldScale) {
    transformString.push('scale(100)');
  }

  return (
    <>
    {posX}
    {posY}
    <img
      ref={setRef}
      height={100} 
      width={100}
      draggable={false}
      // onMouseMove={mouseMovement} 
      // onMouseDown={() => { setMouseDown(true) }}
      // onMouseUp={() => { setMouseDown(false) }}
      // onMouseLeave={() => {setMouseDown(false)}}
      // onTouchStart={() => {setMouseDown(true)}}
      // onTouchEnd={() => {setMouseDown(false)}}
      // onTouchMove={e => console.log(e)}
      src={src} 
      style={{
        transform: transformString.join(' '),
        touchAction: 'none'
      }} />
      {mouseIsDown && 'Mouse is down'}
    </>
  )
}