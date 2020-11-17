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
    const widgets: string[] = this.get('widgets');
    const organization: string = this.get('organization');

    await Promise.all([
      checkWorkspaceRefs(this.model('Layer'), layers, organization),
      checkWorkspaceRefs(this.model('Widget'), widgets, organization),
    ]);
  };
  return fn;
};
