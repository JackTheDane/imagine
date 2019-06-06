
/**
 * Gets the third point in a triangle, where only the two other points and the angle between the inner point and unknown point is known.
 *
 * @param x0 The inner point - X
 * @param y0 The inner point - Y
 * @param x1 The outer point - X
 * @param y1 The outer point - Y
 * @param angle The angle at the inner point, between the two lines
 *
 * @returns [X Coordinate, Y Coordinate]
 */
export function getThirdPointInTriangle(x0: number, y0: number, x1: number, y1: number, angle: number): [number, number] {
  try {
    if (angle === 0) {
      return ([
        x1,
        y1
      ]);
    }

    // Get the distance between point and center
    const l = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));

    // Return if no distance
    if (l === 0) {
      return [x1, y1];
    }

    // Get degrees in radian
    const Arad: number = ((angle > 0 ? angle : 360 - angle) * Math.PI) / 180; //degrees to radians

    //unit vector
    const uAx1: number = (x1 - x0) / l;
    const uAy1: number = (y1 - y0) / l;

    //rotated vector
    let uABx: number;
    let uABy: number;

    // Populate the vectors
    if (angle > 0) {
      uABx = uAx1 * Math.cos(Arad) - uAy1 * Math.sin(Arad);
      uABy = uAx1 * Math.sin(Arad) + uAy1 * Math.cos(Arad);
    } else {
      uABx = uAx1 * Math.cos(Arad) + uAy1 * Math.sin(Arad);
      uABy = - uAx1 * Math.sin(Arad) + uAy1 * Math.cos(Arad);
    }

    // Return new coordinates
    return ([
      x0 + l * uABx,
      y0 + l * uABy
    ]);

  } catch (error) {
    return ([
      x1,
      y1
    ]);
  }
}
