import { boolean } from 'boolean';

import { KEEP_METRIC_VERSIONS } from '../../config';
import { getLogger } from '../../logging';

const logger = getLogger();

/**
 * Pre-save middleware.
 *
 * Handles version bump on document change.
 */
export const metricVersionIncOnUpdateMw = function () {
  const fn = async function () {
    const parent: string = this.get('location');
    const slug: string = this.get('slug');

    const res = await this.model('Metric').findOne({ location: parent, slug: slug }).sort('-version').select('version');
    if (res) {
      const version = res['version'] + 1; // inc previous version;
      this.set({ version });
    }
  };
  return fn;
};

/**
 * Post-save middleware.
 *
 * Update child references on parent document.
 */
export const metricUpdateRefLinksOnUpdateMw = function () {
  const fn = async function () {
    const id: string = this.get('id');
    const slug: string = this.get('slug');
    const parent: string = this.get('location');

    // find previous versions;
    const ids = await this.model('Metric')
      .find({ _id: { $nin: [id] }, location: parent, slug: slug })
      .distinct('_id');

    if (ids.length && !boolean(KEEP_METRIC_VERSIONS)) {
      logger.debug('[metricUpdateRefLinksOnUpdateMw] removing previous versions: %s for parent: %s', ids.join(','), id);

      await this.model('Metric').deleteMany({ _id: { $in: ids } });
    }

    logger.debug(
      '[metricUpdateRefLinksOnUpdateMw] handling references for parent: %s saved: %s removed: %s',
      parent,
      id,
      ids.join(',')
    );

    const bulkOps = [
      // atomically adds a value to an array unless the value is already present;
      { updateOne: { filter: { _id: parent }, update: { $addToSet: { metrics: [id] } } } },
      // atomically removes all instances of a value or values that match a specified condition;
      { updateOne: { filter: { _id: parent }, update: { $pull: { metrics: { $in: ids } } } } },
    ];
    await this.model('Location').bulkWrite(bulkOps, { ordered: false });
  };
  return fn;
};

/**
 * Post-remove middleware.
 *
 * Remove child reference from parent when child is deleted.
 */
export const metricRemoveRefLinksOnDeleteMw = function () {
  const fn = async function () {
    const id: string = this.get('id');
    const parent: string = this.get('location');

    logger.debug('[metricRemoveRefLinksOnDeleteMw] removing reference: %s from parent: %s', id, parent);

    // atomically removes all instances of a value or values that match a specified condition;
    await this.model('Location').findByIdAndUpdate({ _id: parent }, { $pull: { metrics: { $in: [id] } } });
  };
  return fn;
};
