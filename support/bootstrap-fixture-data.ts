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
import * as readline from 'readline';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import * as yargs from 'yargs';

import { API_BASE } from '../src/config';
import { Location, LocationTypeEnum, Layer, LayerTypeEnum, LayerCategoryEnum } from '../src/models';

const argv = yargs.options({
  apiHost: { type: 'string', demandOption: true },
  organization: { type: 'string', demandOption: true },
  dryRun: { type: 'boolean', default: false },
  apiKey: { type: 'string', demandOption: true },
  type: { type: 'string', default: 'location' },
}).argv;

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

interface IResourceCreator {
  processLine?(line: string): Promise<void>;
  processData?(data: any, parent: IResourceCreator): Promise<void>;
  writeHeaders?(): void;
  toStdout(record: any, error?: boolean);
  createResource(body: any, endpoint?: string): Promise<void>;
}

abstract class ResourceCreator implements IResourceCreator {
  async processData(data: any, parent: IResourceCreator): Promise<void> {
    try {
      if (argv.dryRun) {
      } else if (argv.apiKey) {
        await parent.createResource(data);
      }

      parent.toStdout(data);
    } catch (err) {
      parent.toStdout(data, true);
    }
  }

  toStdout(record: any, error: boolean = false) {
    const print = error ? console.error.bind(console) : console.debug.bind(console);

    print(record);
  }

  async createResource(body: any, endpoint: string): Promise<void> {
    const headers = {
      ApiKey: argv.apiKey,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(endpoint, body, { headers });

      if (response.status === 200) {
        return response.data;
      }
    } catch (err) {
      console.error(err.message);

      if (err.response && err.response.data) {
        console.error(JSON.stringify(err.response.data, null, 2));
      }
    }
  }
}

class LocationResourceCreator extends ResourceCreator {
  async processLine(line: string): Promise<void> {
    const data = JSON.parse(line);

    const location: Location = {
      id: data['id'] || uuidv4(),
      slug: slugifyName(data['name']),
      name: cleanStr(data['name']),
      type: <LocationTypeEnum>splitPascalCase(data['type']),
      description: cleanStr(data['description']),
      published: data['published'],
      featured: data['featured'],
      geojson: data['geojson'],
      publicResource: !!data['publicResource'],
      organization: argv.organization,
    };

    await super.processData(location, this);
  }

  writeHeaders(): void {
    console.log(['<ID>', '<SLUG>', '<NAME>', '<TYPE>', '<FEATURED>', '<PUBLISHED>'].join('\t'));
  }

  toStdout(record: Location, error: boolean = false) {
    const message = [record.id, record.slug, record.name, record.type, record.featured, record.published].join('\t');

    super.toStdout(message, error);
  }

  async createResource(body: Location): Promise<void> {
    await super.createResource(body, `${argv.apiHost}${API_BASE}/management/locations?group=${argv.organization}`);
  }
}

class LayerResourceCreator extends ResourceCreator {
  async processLine(line: string): Promise<void> {
    const data = JSON.parse(line);

    const layer: Layer = {
      id: data['id'] || uuidv4(),
      slug: slugifyName(data['name']),
      name: cleanStr(data['name']),
      type: <LayerTypeEnum>splitPascalCase(data['type']),
      category: [<LayerCategoryEnum>data['category']],
      description: cleanStr(data['description']),
      published: String(data['published']).toLowerCase() === 'true',
      primary: String(data['primary']).toLowerCase() === 'true',
      provider: data['provider'],
      config: JSON.parse(data['config']),
      references: data['references'] || [],
      organization: argv.organization,
    };

    await super.processData(layer, this);
  }

  writeHeaders(): void {
    console.log(
      [
        '<ID>',
        '<SLUG>',
        '<NAME>',
        '<TYPE>',
        '<CATEGORY>',
        '<DESCRIPTION>',
        '<PUBLISHED>',
        '<PRIMARY>',
        '<PROVIDER>',
        '<CONFIG>',
        '<REFERENCES>',
      ].join('\t')
    );
  }

  toStdout(record: Layer, error: boolean = false) {
    const message = [
      record.id,
      record.slug,
      record.name,
      record.type,
      record.category,
      record.description,
      record.published,
      record.primary,
      record.provider,
      record.config,
    ].join('\t');

    super.toStdout(message, error);
  }

  async createResource(body: Layer): Promise<void> {
    await super.createResource(body, `${argv.apiHost}${API_BASE}/management/layers?group=${argv.organization}`);
  }
}

const main = async (): Promise<void> => {
  let resourceCreator: IResourceCreator;

  switch (argv.type) {
    case 'location':
      resourceCreator = new LocationResourceCreator();

    case 'layer':
      resourceCreator = new LayerResourceCreator();
  }

  const reader = readline.createInterface({
    input: process.stdin,
  });

  let counter: number = 0;

  for await (const line of reader) {
    if (counter === 0) {
      resourceCreator.writeHeaders();
    }

    counter++;

    await resourceCreator.processLine(line);
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
