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

import axios from 'axios';
import { has, isString, merge, set } from 'lodash';
import * as readline from 'readline';
import * as yargs from 'yargs';

import { API_BASE } from '../src/config';
import { Layer, LayerCategoryEnum, LayerProviderEnum, LayerTypeEnum, Location, LocationTypeEnum } from '../src/models';

const argv = yargs.options({
  apiHost: { type: 'string', demandOption: true },
  organization: { type: 'string', demandOption: true },
  dryRun: { type: 'boolean', default: false },
  apiKey: { type: 'string', demandOption: true },
  type: { type: 'string', choices: ['location', 'layer'], default: 'location' },
}).argv;

interface IResourceCreator {
  processLine?(line: string): Promise<void>;
  processData?(data: any, parent: IResourceCreator): Promise<void>;
  writeHeaders?(line: string): void;
  toStdout(record: any, error?: boolean, sep?: string);
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

  writeHeaders(line: string, sep: string = '\t'): void {
    const data = JSON.parse(line);
    console.log(Object.keys(data).sort().join(sep));
  }

  toStdout(record: any, error: boolean = false, sep: string = '\t') {
    const keys = Object.keys(record).sort();
    const message = keys.reduce((acc, key) => {
      acc.push(record[key]);
      return acc;
    }, []);

    const print = error ? console.error.bind(console) : console.debug.bind(console);
    print(message.join(sep));
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

  /**
   * Validate optional fields if present in the input.
   * @param data
   * @param optionals
   */
  parseOptionals = <T, L extends keyof T>(data: T, optionals: L[] = []): any => {
    const output = {};
    optionals.forEach((key) => {
      if (has(data, key)) {
        const value = data[key];
        set(output, key, isString(value) ? this.cleanStr(<any>value) : value);
      }
    });
    return output;
  };

  cleanStr = (str: string) => {
    return str ? str.trim() : null;
  };
}

class LocationResourceCreator extends ResourceCreator {
  async processLine(line: string): Promise<void> {
    const data: Partial<Location> = JSON.parse(line);

    const mandatory: Partial<Location> = {
      name: this.cleanStr(data.name),
      type: <LocationTypeEnum>this.cleanStr(data.type),
      geojson: data.geojson,
    };
    const optional = this.parseOptionals(data, [
      'id',
      'slug',
      'description',
      'published',
      'featured',
      'publicResource',
    ]);
    const location = merge(mandatory, optional);

    await super.processData(location, this);
  }

  async createResource(body: Location): Promise<void> {
    await super.createResource(body, `${argv.apiHost}${API_BASE}/management/locations?group=${argv.organization}`);
  }
}

class LayerResourceCreator extends ResourceCreator {
  async processLine(line: string): Promise<void> {
    const data: Partial<Layer> = JSON.parse(line);

    const mandatory: Partial<Layer> = {
      name: this.cleanStr(data.name),
      type: <LayerTypeEnum>this.cleanStr(data.type),
      category: [<LayerCategoryEnum>this.cleanStr(<any>data.category)],
      provider: <LayerProviderEnum>this.cleanStr(data.provider),
      config: isString(data.config) ? JSON.parse(data.config) : data.config,
    };
    const optional = this.parseOptionals(data, ['id', 'slug', 'description', 'published', 'primary', 'references']);
    const layer = merge(mandatory, optional);

    await super.processData(layer, this);
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
      break;
    case 'layer':
      resourceCreator = new LayerResourceCreator();
      break;
  }

  const reader = readline.createInterface({
    input: process.stdin,
  });

  let counter: number = 0;

  for await (const line of reader) {
    if (counter === 0) {
      resourceCreator.writeHeaders(line);
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
