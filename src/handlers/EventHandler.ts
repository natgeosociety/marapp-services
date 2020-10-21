import { Context, SNSEvent } from 'aws-lambda';
import { Model } from 'mongoose';
import { performance } from 'perf_hooks';

import { MongooseQueryFilter, MongooseQueryParser } from '../helpers/mongoose';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { CollectionModel, DashboardModel, LayerModel, LocationModel, WidgetModel } from '../models';
import { IESPlugin } from '../models/plugins/elasticsearch';
import { getAllStream, removeByQuery } from '../models/utils';
import { SNSWipeDataEvent } from '../services/sns';
import { removeLayerMapTiles } from '../services/storage-service';

const logger = getLogger();

export const wipeDataTaskHandler = async (event: SNSEvent, context: Context) => {
  const messageId = event?.Records?.[0]?.Sns?.MessageId;
  const message = event?.Records?.[0]?.Sns?.Message;

  logger.debug(`received SNS event: ${messageId}`);

  const decoded = JSON.parse(message);
  const { organizationId, organizationName } = <SNSWipeDataEvent>decoded;

  logger.debug('removing records for organization %s with slug: %s', organizationId, organizationName);

  return new Promise(async (resolve, reject) => {
    const parser = new MongooseQueryParser();
    const models: Model<any>[] = [LocationModel, CollectionModel, LayerModel, WidgetModel, DashboardModel];

    const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: organizationName }];
    const queryOptions = parser.parse(null, { predefined });

    const t0 = performance.now();
    const layerStream = await getAllStream(LayerModel, queryOptions);
    await removeLayerMapTiles(layerStream);

    logger.debug('[removeMapTiles] duration: %s (ms)', performance.now() - t0);

    const t1 = performance.now();
    await forEachAsync(models, async (model: Model<any>) => removeByQuery(model, { organization: organizationName }));

    logger.debug('[removeByQuery] duration: %s (ms)', performance.now() - t1);

    const t2 = performance.now();
    await forEachAsync(models, async (model: IESPlugin) => model.esDeleteByQuery({ organization: organizationName }));

    logger.debug('[esDeleteByQuery] duration: %s (ms)', performance.now() - t2);

    resolve();
  }).catch((err) => {
    logger.warn('failed to wipe environment for organization %s with slug: %s', organizationId, organizationName);
    logger.error(err);
  });
};
