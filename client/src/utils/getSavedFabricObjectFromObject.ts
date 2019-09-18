import { ISavedFabricObject } from "../models/interfaces/ISavedFabricObject";
import { getValueElse } from "./getValueElse";
import { getThirdPointInTriangle } from "./getThirdPointInTriangle";

/**
 * Returns an ISavedFabricObject from a fabric.Object.
 * This includes the coordinates of any group that the object might be part of.
 *
 * @param fabric.Object
 */
export const getSavedFabricObjectFromObject = (object: fabric.Object): ISavedFabricObject | undefined => {
  if (!object) {
    return;
  }

  const { top, left, scaleX, scaleY, angle, group } = object;

  const r: ISavedFabricObject = {
    top: getValueElse(top, 0),
    scale: getValueElse(scaleX || scaleY, 0),
    left: getValueElse(left, 0),
    angle: getValueElse(angle, 0),
    src: (object as fabric.Image).getSrc()
  };

  if (group) {

    if (group.angle) {
      r.angle += group.angle;

      if (object.top != null && object.left != null) {
        const [x, y]: [number, number] = getThirdPointInTriangle(0, 0, object.left, object.top, group.angle);

        r.left = x;
        r.top = y;
      }
    }

    const scalingFactor: number = group.scaleX || group.scaleY || 1;

    if (scalingFactor !== 1) {
      r.scale *= scalingFactor;
      r.top *= scalingFactor;
      r.left *= scalingFactor;
    }

    if (group.top != null) {
      r.top += group.top;
    }

    if (group.left != null) {
      r.left += group.left;
    }
  }

  return {
    top: Math.round(r.top),
    angle: Math.round(r.angle),
    left: Math.round(r.left),
    scale: r.scale,
    src: r.src
  };
};
