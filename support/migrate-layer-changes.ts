#!/usr/bin/env ./node_modules/.bin/ts-node --files

/*
  Copyright 2018-2020 National Geographic Society

  Use of this software does not constitute endorsement by National Geographic
  Society (NGS). The NGS name and NGS logo may not be used for any purpose without
  written permission from NGS.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software distributed
  under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
  CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import * as readline from 'readline';
import * as yargs from 'yargs';

import { MONGODB_URI } from '../src/config';
import { createMongoConnection } from '../src/helpers/mongoose';
import { getLogger } from '../src/logging';
import { Layer, LayerModel } from '../src/models';
import { update } from '../src/models/utils';

const logger = getLogger();

const argv = yargs.options({
  dryRun: { type: 'boolean', default: true },
}).argv;

/**
 * Migrate layer model based on ID.
 * @param layerId
 */
const processLayerById = async (layerId: string) => {
  try {
    const query = LayerModel.findOne({ _id: layerId });
    const doc = await query.exec();
    if (!doc) {
      logger.error('[processLayerById] layer not found: %s', layerId);
      return;
    }
    const data: Partial<Layer> = {}; // TODO:

    if (!argv.dryRun) {
      await update(LayerModel, doc, <any>data);
    }
    logger.info('[processLayerById] processed layer %s: %O', doc.id);
  } catch (err) {
    logger.error('[processLayerById] error processing layer: %s\n%O', layerId, err);
  }
};

const main = async (): Promise<void> => {
  await createMongoConnection(MONGODB_URI);

  const reader = readline.createInterface({
    input: process.stdin,
  });

  let counter: number = 0;

  for await (const layerId of reader) {
    logger.info('[main] processing line: %s', layerId);
    counter++;

    await processLayerById(layerId);
  }
};

main()
  .then(() => {
    console.debug('Success!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
