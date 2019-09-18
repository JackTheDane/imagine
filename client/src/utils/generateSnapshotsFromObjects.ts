import { IObjectSnapshot } from "../components/PlayerView/ArtistView/ArtistView";
import { ISavedFabricObject } from "../models/interfaces/ISavedFabricObject";
import { getSavedFabricObjectFromObject } from "./getSavedFabricObjectFromObject";

export const generateSnapshotsFromObjects = (objects: fabric.Object[]): IObjectSnapshot => {

  const objectSnapshot: IObjectSnapshot = {};

  objects.forEach(o => {
    // Check for object name and that it is not already set to the snapShot
    if (o.name && !objectSnapshot[o.name]) {
      const savedFabricObject: ISavedFabricObject | undefined = getSavedFabricObjectFromObject(o);

      // Check if savedFabricObject was returned correctly
      if (savedFabricObject) {
        objectSnapshot[o.name] = savedFabricObject; // If so, set to snapshot
      }
    }
  });

  return objectSnapshot;
};
