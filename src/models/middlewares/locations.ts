import { get, isArray, isEmpty } from 'lodash';

import { forEachAsync } from '../../helpers/util';
import { getLogger } from '../../logging';
import {
  computeAreaKm2,
  computeShapeBbox,
  computeShapeCentroid,
  mergeGeojson,
  normalizeGeojson,
} from '../../services/geospatial';
import { LocationModel, LocationTypeEnum } from '../LocationModel';
import { getByIds } from '../utils';

import { checkWorkspaceRefs } from './index';

const logger = getLogger();

/**
 * Pre-save middleware.
 *
 * Computes bbox, centroid, areaKm2 on GeoJSON change.
 * Version increment on GeoJSON change
 */
export const computeGeoJSONOnChangeMw = function () {
  const fn = async function () {
    const type: LocationTypeEnum = this.get('type');
    const geoJSON: any = this.get('geojson');

    if (type === LocationTypeEnum.COLLECTION) {
      // exclude saving computed fields;
      this.set({ geojson: undefined, bbox2d: undefined, areaKm2: undefined, centroid: undefined });
    }
    if (geoJSON && !isEmpty(geoJSON) && this.isModified('geojson')) {
      logger.debug('[computeGeoJSONOnChangeMw] shape changes detected, recomputing: bbox, centroid, areaKm2');

      const geojson = normalizeGeojson(geoJSON);
      const bbox2d = computeShapeBbox(geojson);
      const areaKm2 = computeAreaKm2(geojson);
      const centroid = computeShapeCentroid(geojson);

      const version = this.isNew ? this.get('version') : this.get('version') + 1;

      this.set({ geojson, bbox2d, areaKm2, centroid, version });
    }
  };
  return fn;
};

/**
 * Pre-save middleware.
 *
 * Validate collection IDs from nested references.
 */
export const checkRefLinksOnUpdateMw = function () {
  const fn = async function () {
    const locations: string[] = this.get('locations');
    const organization: string = this.get('organization');

    await checkWorkspaceRefs(this.model('Location'), locations, organization, true);
  };
  return fn;
};

/**
 * Post-save middleware.
 *
 * Remove nested references on document unpublish.
 */
export const removeRefLinksOnUpdateMw = function () {
  const fn = async function () {
    const published: boolean = this.get('published');
    const publicResource: boolean = this.get('publicResource');

    if (!published || !publicResource) {
      const id: string = this.get('id');
      const res = await this.model('Location').updateMany(
        { locations: { $in: [id] } },
        { $pull: { locations: { $in: [id] } } }
      );
      logger.debug('[removeRefLinksOnUpdateMw] removed reference: %s from %s record(s)', id, res.nModified);
    }
  };
  return fn;
};

/**
 * Post-remove middleware.
 *
 * Remove nested references on document deletion.
 */
export const removeRefLinksOnDeleteMw = function () {
  const fn = async function () {
    const id: string = this.get('id');
    const metrics: string[] = this.get('metrics');

    if (metrics.length) {
      await this.model('Metric').deleteMany({ _id: { $in: metrics } });

      logger.debug('[removeRefLinksOnDeleteMw] removed docs from parent refs: %s', metrics.join(','));
    }

    const res = await this.model('Location').updateMany(
      { locations: { $in: [id] } },
      { $pull: { locations: { $in: [id] } } }
    );
    logger.debug('[removeRefLinksOnDeleteMw] removed reference: %s from %s record(s)', id, res.nModified);
  };
  return fn;
};

/**
 * Post-find middleware.
 *
 * Computes bbox, centroid, areaKm2 and GeoJSON from nested references.
 */
export const computeCollectionGeoJSONMw = function () {
  const fn = async function (results) {
    if (!isArray(results)) {
      results = [results];
    }
    await forEachAsync(results, async (result) => {
      const locationIds = get(result, 'locations', []).map((e) => (typeof e === 'string' ? e : e.id));
      if (locationIds.length) {
        logger.debug('[computeCollectionGeoJSONMw] found location references: %s', locationIds.join(', '));

        const geojsonArray = await getByIds(LocationModel, locationIds, { select: { geojson: 1 } });
        const geojson = mergeGeojson(<any>geojsonArray.map((e) => e.geojson));

        result.geojson = geojson;
        result.bbox2d = computeShapeBbox(geojson);
        result.areaKm2 = computeAreaKm2(geojson);
        result.centroid = computeShapeCentroid(geojson);
      }
    });
  };
  return fn;
};
