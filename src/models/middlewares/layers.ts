import { getLogger } from '../../logging';

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
