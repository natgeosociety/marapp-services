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
import * as readline from 'readline';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import * as yargs from 'yargs';

import { API_BASE } from '../src/config';
import { Location, LocationTypeEnum } from '../src/models';

const API_HOST = '<API_HOST_NAME>';

const argv = yargs.options({
  organization: { type: 'string', demandOption: true },
  dryRun: { type: 'boolean', default: false },
  apiKey: { type: 'string', demandOption: true },
}).argv;

const processLine = async (line: string): Promise<void> => {
  const data = JSON.parse(line);

  const location: Location = {
    id: data['id'] || uuidv4(),
    slug: data['slug'] || slugifyName(data['name']),
    name: cleanStr(data['name']),
    type: <LocationTypeEnum>splitPascalCase(data['type']),
    description: cleanStr(data['description']),
    published: data['published'],
    featured: data['featured'],
    geojson: data['geojson'],
    organization: argv.organization,
  };

  try {
    if (argv.dryRun) {
    } else if (argv.apiKey) {
      await createResource(location);
    }
    toStdout(location);
  } catch (err) {
    toStdout(location, true);
  }
};

const cleanStr = (str: string) => {
  return str ? str.trim() : null;
};

const slugifyName = (str: string) => {
  const sanitized = cleanStr(str);
  return slug(sanitized).toLowerCase();
};

const splitPascalCase = (str: string) => {
  return cleanStr(str)
    .replace(/([A-Z][a-z])/g, ' $1')
    .replace(/(\d)/g, ' $1')
    .trim();
};

const writeHeaders = () => {
  console.log(['<ID>', '<SLUG>', '<NAME>', '<TYPE>', '<FEATURED>', '<PUBLISHED>'].join('\t'));
};

const toStdout = (record: Location, error: boolean = false) => {
  const message = [record.id, record.slug, record.name, record.type, record.featured, record.published].join('\t');
  const print = error ? console.error.bind(console) : console.debug.bind(console);
  print(message);
};

/**
 * Creates a resource using API endpoints.
 * @param body
 */
const createResource = async (body: Location): Promise<void> => {
  const headers = {
    ApiKey: argv.apiKey,
    'Content-Type': 'application/json',
  };

  const endpoint = `${API_HOST}/${API_BASE}/management/locations?group=${argv.organization}`;
  try {
    const response = await axios.post(endpoint, body, { headers });
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.error(chalk.bgRed(err.message));
    if (err.response && err.response.data) {
      console.error(JSON.stringify(err.response.data, null, 2));
    }
  }
};

const main = async (): Promise<void> => {
  const reader = readline.createInterface({
    input: process.stdin,
  });

  let counter: number = 0;
  for await (const line of reader) {
    if (counter === 0) {
      writeHeaders();
    }
    counter++;

    await processLine(line);
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
