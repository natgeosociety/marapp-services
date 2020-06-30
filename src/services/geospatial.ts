import { merge } from '@mapbox/geojson-merge';
import normalize from '@mapbox/geojson-normalize';
import * as turf from '@turf/turf';
import makeError from 'make-error';

import { getLogger } from '../logging';

export const GeoComputeError = makeError('GeoComputeError');

const logger = getLogger('geospatial');

/**
 * Takes a set of features, calculates the bbox of all input features, and returns a bounding box.
 * @param geojson: GeoJSON to be centered
 * @param raiseError
 */
export const computeShapeBbox = (geojson: turf.AllGeoJSON, raiseError: boolean = true): turf.BBox => {
  try {
    return turf.bbox(geojson);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new GeoComputeError('Could not compute bbox.');
    }
  }
};

/**
 * Takes one or more features and calculates the centroid using the mean of all vertices.
 * @param geojson: GeoJSON to be centered
 * @param properties: an Object that is used as the Feature 's properties
 * @param raiseError
 */
export const computeShapeCentroid = (
  geojson: turf.AllGeoJSON,
  properties: turf.Properties = {},
  raiseError: boolean = true
): turf.Feature<turf.Point> => {
  try {
    return turf.centroid(geojson);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new GeoComputeError('Could not compute centroid.');
    }
  }
  return null;
};

/**
 * Takes one or more features and returns their area in square kilometers.
 * @param geojson: input GeoJSON feature(s)
 * @param raiseError
 * @return number: area in square kilometers
 */
export const computeAreaKm2 = (geojson: turf.AllGeoJSON, raiseError: boolean = true): number => {
  try {
    const area = turf.area(geojson); // area in square meters;
    if (area !== 0) {
      return area / 1e6; // divide the area value by 1e+6;
    }
    return 0;
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new GeoComputeError('Could not compute area/km2.');
    }
  }
  return null;
};

/**
 * Flatten any GeoJSON object into a single GeometryCollection.
 * @param geojson: any valid GeoJSON Object
 * @param raiseError
 */
export const geojsonToGeometryCollection = (
  geojson: turf.AllGeoJSON,
  raiseError: boolean = true
): turf.GeometryCollection => {
  try {
    const flattened = turf.flatten(geojson);
    const geometries = flattened.features.map((feat) => turf.getGeom(feat));

    return turf.geometryCollection(geometries).geometry;
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new GeoComputeError('Could not flatten GeoJSON object into a single GeometryCollection.');
    }
  }
  return null;
};

/**
 * Normalize any GeoJSON object into a GeoJSON FeatureCollection.
 */
export const normalizeGeojson = (geojson: turf.AllGeoJSON, raiseError: boolean = true): turf.FeatureCollection => {
  try {
    const featureCollection = normalize(geojson);
    featureCollection.features = featureCollection.features.map((feat: turf.Feature) => {
      feat.properties = feat.properties || {};
      return feat;
    });
    return featureCollection;
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new GeoComputeError('Could not normalize GeoJSON object into a FeatureCollection.');
    }
  }
  return null;
};

/**
 * Merge a series of GeoJSON objects into one FeatureCollection containing all features.
 * @param geojsonArray
 * @param raiseError
 */
export const mergeGeojson = (geojsonArray: turf.AllGeoJSON[], raiseError: boolean = true): turf.FeatureCollection => {
  try {
    return merge(geojsonArray);
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new GeoComputeError('Could not merge GeoJSON array object into a single FeatureCollection.');
    }
  }
};
