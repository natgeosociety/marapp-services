import { Context, Handler, SNSEvent } from 'aws-lambda';
import { Model } from 'mongoose';
import { performance } from 'perf_hooks';

import { MongooseQueryFilter, MongooseQueryParser } from '../helpers/mongoose';
import { forEachAsync } from '../helpers/util';
import { getLogger } from '../logging';
import { DashboardModel, LayerModel, LocationModel, WidgetModel } from '../models';
import { IESPlugin } from '../models/plugins/elasticsearch';
import { getAllStream, removeByQuery } from '../models/utils';
import { SNSWipeLayerDataEvent, SNSWipeOrgDataEvent, WipeDataEnum } from '../services/sns';
import { removeLayerMapTiles, removeLayerMapTilesFromStream } from '../services/storage-service';

import { contextEventHandler } from '.';

const logger = getLogger();

export const wipeDataTaskHandler: Handler = contextEventHandler(async (event: SNSEvent, context: Context) => {
  const messageId = event?.Records?.[0]?.Sns?.MessageId;
  const message = event?.Records?.[0]?.Sns?.Message;

  logger.debug('[wipeDataTaskHandler] received SNS event: %s', messageId);

  const decoded: SNSWipeOrgDataEvent | SNSWipeLayerDataEvent = JSON.parse(message);

  switch (decoded.type) {
    case WipeDataEnum.ORGANIZATION: {
      const { organizationId, organizationName } = decoded;
      try {
        logger.debug('[wipeDataTaskHandler] removing records for organization: %s', organizationName);

        const parser = new MongooseQueryParser();
        const models: Model<any>[] = [LocationModel, LayerModel, WidgetModel, DashboardModel];

        const predefined: MongooseQueryFilter[] = [{ key: 'organization', op: 'in', value: organizationName }];
        const queryOptions = parser.parse(null, { predefined });

        const t0 = performance.now();
        const layerStream = await getAllStream(LayerModel, queryOptions);
        await removeLayerMapTilesFromStream(layerStream);

        logger.debug('[wipeDataTaskHandler][removeLayerMapTiles] duration: %s (ms)', performance.now() - t0);

        const t1 = performance.now();
        await forEachAsync(models, async (model: Model<any>) =>
          removeByQuery(model, { organization: organizationName })
        );

        logger.debug('[wipeDataTaskHandler][removeByQuery] duration: %s (ms)', performance.now() - t1);

        const t2 = performance.now();
        await forEachAsync(models, async (model: IESPlugin) =>
          model.esDeleteByQuery({ organization: organizationName })
        );

        logger.debug('[wipeDataTaskHandler][esDeleteByQuery] duration: %s (ms)', performance.now() - t2);
      } catch (err) {
        logger.error('[wipeDataTaskHandler] failed to remove assets for organization: %s', organizationName);
        logger.error(err);
      }
      break;
    }

    case WipeDataEnum.LAYER: {
      const { layerId } = decoded;
      try {
        logger.debug('[wipeDataTaskHandler] removing records for layer: %s', layerId);

        const t0 = performance.now();
        await removeLayerMapTiles([layerId]);

        logger.debug('[wipeDataTaskHandler][removeLayerMapTiles] duration: %s (ms)', performance.now() - t0);
      } catch (err) {
        logger.error('[wipeDataTaskHandler] failed to remove assets for layer: %s', layerId);
        logger.error(err);
      }
      break;
    }

    default: {
      logger.error('Unsupported operation type.');
    }
  }
});
