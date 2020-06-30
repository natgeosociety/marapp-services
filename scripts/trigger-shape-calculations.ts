#!/usr/bin/env ts-node --files

import axios from 'axios';
import * as chalk from 'chalk';
import * as yargs from 'yargs';

import { forEachAsync } from '../src/helpers/util';
import { OperationTypeEnum, publishSNSMessage, SNSMessage } from '../src/services/sns';
import { API_BASE } from '../src/config';

const API_HOST = '<API_HOST_NAME>';

const argv = yargs.options({
  apiKey: { type: 'string', demandOption: true },
  organization: { type: 'string' },
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
  let endpoint = `${API_HOST}/${API_BASE}/management/locations`;
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
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
