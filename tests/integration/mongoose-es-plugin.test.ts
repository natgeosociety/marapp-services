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

import { Document, model, Schema, Model } from 'mongoose';

import esPlugin, { IESPlugin } from '../../src/models/plugins/elasticsearch';
import { createMongoConnection } from '../../src/helpers/mongoose';
import { MONGODB_URI } from '../../src/config';

const TestSchema: Schema = new Schema({
  name: { type: String, required: true },
  available: { type: Boolean },
});

TestSchema.plugin(esPlugin, {
  settings: {
    analysis: {
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'autocomplete_tokenizer',
          filter: ['asciifolding', 'lowercase'],
        },
        autocomplete_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['asciifolding', 'lowercase'],
        },
      },
      tokenizer: {
        autocomplete_tokenizer: {
          type: 'edge_ngram',
          min_gram: 1,
          max_gram: 25,
          token_chars: ['letter', 'digit'],
        },
      },
    },
  },
  mappings: {
    properties: {
      name: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'autocomplete_search_analyzer' },
      available: { type: 'boolean' },
    },
  },
});

interface TestDocument extends Document {}
interface ITestModel extends Model<TestDocument>, IESPlugin {}
let TestModel: ITestModel;

beforeAll(async () => {
  await createMongoConnection(MONGODB_URI);
  TestModel = model('Test', TestSchema);
});

xdescribe('Mongoose elasticsearch plugin', () => {
  it('should not find any document', async () => {
    const result = await TestModel.findOne({});

    expect(result).toBeFalsy();
  });

  it('should save a new document', async () => {
    const doc = new TestModel({ name: 'John', available: true });
    const result = await doc.save();

    expect(result).toBeTruthy();
  });

  it('should find the new document', async () => {
    const result = await TestModel.findOne({ name: 'John' });

    expect(result).toBeTruthy();
  });

  it('should delete the new document', async () => {
    await TestModel.deleteOne({ name: 'John' });
  });

  it('should not find the deleted document', async () => {
    const result = await TestModel.findOne({ name: 'John' });

    expect(result).toBeFalsy();
  });

  it('should use ES plugin and not find any document', async () => {
    const result = await TestModel.esSearch(
      {
        query: {
          match_all: {},
        },
      },
      0,
      10
    );

    expect(result.hits.total).toBe(0);
  });

  it('should save a new document and be indexed by ES', async () => {
    const doc = new TestModel({ name: 'John2', available: true });
    const result = await doc.save();

    expect(result).toBeTruthy();
  });

  it('should use ES plugin and find the new document', async () => {
    const result = await TestModel.esSearch(
      {
        query: {
          match_all: {},
        },
      },
      0,
      10
    );

    expect(result.hits.total).toBeGreaterThan(0);
  });
});

afterAll(async () => {
  // cleanup existing documents (drop all the existing data);

  await TestModel.deleteMany({});
});
