import { fabric } from 'fabric';


export const rescaleAllFabricObjects = (
  canvas: fabric.Canvas | fabric.StaticCanvas,
  newScale: number
): void => {
  if (!canvas || !newScale) return;

  canvas.setWidth(canvas.getWidth() * newScale);
  canvas.setHeight(canvas.getHeight() * newScale);

  const objects: fabric.Object[] = canvas.getObjects();
  console.log(objects);

  // array of already scaled groups to prevent groups being scaled multiple times
  const alreadyScaledGroups: fabric.Group[] = [];

  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];


    if (object.group) {

      // Continue if the group has already been scaled
      if (alreadyScaledGroups.includes(object.group)) {
        continue;
      }

      const scale: number = object.group.scaleX
        ? object.group.scaleX
        : object.group.scaleY
          ? object.group.scaleY
          : 1;

      object.group.scale(scale * newScale);

      if (object.group.top) {
        object.group.top = object.group.top * newScale;
      }

      if (object.group.left) {
        object.group.left = object.group.left * newScale;
      }

      alreadyScaledGroups.push(object.group);

      continue;
    }

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
