import * as React from 'react';
import { InteractiveImage } from '../InteractiveImage/InteractiveImage'


export function ArtistCanvas() {

  const refFromUseRef = React.useRef<HTMLElement | string>();

  const setRef = (node: string | HTMLElement | null) => {
    if (node && !refFromUseRef.current) {
      refFromUseRef.current = node;
    }
  }

  return (
    <>
    <button onClick={() => { console.log(refFromUseRef.current) }}>Test</button>

    <InteractiveImage src="https://upload.wikimedia.org/wikipedia/en/f/f1/Tomruen_test.svg" />

    <div ref={setRef}></div>
    </>
  );
}
 