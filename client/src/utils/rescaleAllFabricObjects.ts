import { fabric } from 'fabric';


export const rescaleAllFabricObjects = (
  canvas: fabric.Canvas | fabric.StaticCanvas,
  newScale: number
): void => {
  if (!canvas || !newScale) return;

  canvas.setWidth(canvas.getWidth() * newScale);
  canvas.setHeight(canvas.getHeight() * newScale);

  const objects: fabric.Object[] = canvas.getObjects();

  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];

    const scale: number = object.scaleX
      ? object.scaleX
      : object.scaleY
        ? object.scaleY
        : 1;

    object.scale(scale * newScale);

    if (object.top) {
      object.top = object.top * newScale;
    }

    if (object.left) {
      object.left = object.left * newScale;
    }

  }

  canvas.renderAll();
}
