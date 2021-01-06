import { get, isArray, isEmpty, set } from 'lodash';
import shortid from 'shortid';
import { URL } from 'url';

import { API_URL } from '../../config';
import { getLogger } from '../../logging';
import { SNSWipeLayerDataEvent, triggerWipeDataEvent, WipeDataEnum } from '../../services/sns';

import { checkWorkspaceRefs } from './index';

const logger = getLogger();

/**
 * Pre-save middleware.
 *
 * Validate layers & widgets IDs from nested references.
 */
export const checkRefLinksOnUpdateMw = function () {
  const fn = async function () {
    const references: string[] = this.get('references');
    const organization: string = this.get('organization');

    await checkWorkspaceRefs(this.model('Layer'), references, organization);
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

    const resWidget = await this.model('Widget').updateMany(
      { layers: { $in: [id] } },
      { $pull: { layers: { $in: [id] } } }
    );
    logger.debug('[removeRefLinksOnDeleteMw] removed reference: %s from %s widget(s)', id, resWidget.nModified);

    const resDashboard = await this.model('Dashboard').updateMany(
      { layers: { $in: [id] } },
      { $pull: { layers: { $in: [id] } } }
    );
    logger.debug('[removeRefLinksOnDeleteMw] removed reference: %s from dashboard(s)', id, resDashboard.nModified);

    const resLayer = await this.model('Layer').updateMany(
      { references: { $in: [id] } },
      { $pull: { references: { $in: [id] } } }
    );
    logger.debug('[removeRefLinksOnDeleteMw] removed reference: %s from %s layer(s)', id, resLayer.nModified);
  };
  return fn;
};

/**
 * Post-remove middleware.
 *
 * Remove external resources (S3 map-tiles) on document deletion.
 */
export const removeLayerResourcesOnDeleteMw = function () {
  const fn = async function () {
    const id: string = this.get('id');

    const message: SNSWipeLayerDataEvent = {
      type: WipeDataEnum.LAYER,
      layerId: id,
    };
    const messageId = await triggerWipeDataEvent(message);
    logger.debug('[removeLayerResourcesOnDeleteMw] pushed event %s for layer: %s', messageId, id);
  };
  return fn;
};

/**
 * Pre-save middleware.
 *
 * Handles cache-busting for tiles URL on document change.
 */
export const cacheBustingOnUpdateMw = function (cacheParamKey: string = 'v') {
  const fn = async function () {
    const config: any = this.get('config');

    if (config && !isEmpty(config) && this.isModified('config')) {
      logger.debug('[cacheBustingIncOnUpdateMw] config changes detected, changing cache-busting version');

      const URLs: string[] = get(config, 'source.tiles');

      if (URLs && isArray(URLs) && URLs.length) {
        const newURLs = URLs.map((rawURL: string) => {
          const url = new URL(rawURL);
          if (API_URL.startsWith(url.origin)) {
            const params = url.searchParams;

            // set a cache-busting query string param;
            params.set(cacheParamKey, shortid.generate());

            // change the search property of the main URL;
            url.search = params.toString();
          }
          return decodeURI(url.toString());
        });

        set(config, 'source.tiles', newURLs);

        this.set({ config });
      }
    }
  };
  return fn;
};
