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
    const layers: string[] = this.get('layers');
    const organization: string = this.get('organization');

    await checkWorkspaceRefs(this.model('Layer'), layers, organization);
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

    const resDashboard = await this.model('Dashboard').updateMany(
      { widgets: { $in: [id] } },
      { $pull: { widgets: id } }
    );

    logger.debug('[removeRefLinksOnDeleteMw] removed reference: %s from %s dashboard(s)', id, resDashboard.nModified);
  };
  return fn;
};
