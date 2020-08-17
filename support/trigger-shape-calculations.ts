#!/usr/bin/env ts-node --files

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

import axios from 'axios';
import * as chalk from 'chalk';
import * as yargs from 'yargs';

import { API_BASE } from '../src/config';
import { forEachAsync } from '../src/helpers/util';
import { OperationTypeEnum, publishSNSMessage, SNSMessage } from '../src/services/sns';

const argv = yargs.options({
  apiHost: { type: 'string', demandOption: true },
  organization: { type: 'string', demandOption: true },
  dryRun: { type: 'boolean', default: false },
  apiKey: { type: 'string', demandOption: true },
}).argv;

const main = async (): Promise<void> => {
  const iterator = await fetchResources();

  for await (const page of iterator) {
    const slugs = [];
    await forEachAsync(page.data, async (entry) => {
      const { id, slug, version } = entry.attributes;

      slugs.push(slug);

      return publishEvent(id, version);
    });
    console.log(chalk.green(`Successfully handled events for: ${slugs.join(', ')}`));
  }
};

const publishEvent = async (locationId: string, locationVersion: number): Promise<string> => {
  const message: SNSMessage = {
    id: locationId,
    version: locationVersion,
    operationType: OperationTypeEnum.CALCULATE,
    resources: [],
  };
  return publishSNSMessage(message);
};

async function* fetchResources() {
  const data = await fetchResourcePage(1);

  if (!data.meta.pagination.total) {
    throw Error('Could not read total page size');
  }

  let currentPage = 1;
  const lastPage = data.meta.pagination.total;

  while (currentPage <= lastPage) {
    yield fetchResourcePage(currentPage);
    currentPage++;
  }
}

const fetchResourcePage = async (pageNumber: number = 1, pageSize: number = 100) => {
  let endpoint = `${argv.apiHost}/${API_BASE}/management/locations`;
  const headers = {
    ApiKey: argv.apiKey,
  };
  const params = {
    select: ['id', 'slug', 'version'].join(','),
    'page[number]': pageNumber,
    'page[size]': pageSize,
  };
  if (argv.organization) {
    endpoint = `${endpoint}?group=${argv.organization}`;
  }
  try {
    const res = await axios.get(endpoint, { headers, params });

    console.log(chalk.yellow(`Successfully handled page: ${pageNumber}`));

    return res.data;
  } catch (err) {
    console.error(chalk.bgRed(err.message));
    throw Error(err.message);
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
