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

import { ElasticSearchService } from '../../src/services/search-service';

let ES: ElasticSearchService;

beforeAll(async () => {
  ES = await new ElasticSearchService();
});

describe('Search service', () => {
  const indexName = `new-index-${Math.random()}`;

  it('should not find the new index', async () => {
    const indexCreated = await ES.hasIndex(indexName);

    expect(indexCreated).toBe(false);
  });

  it('should create a new index', async () => {
    await ES.createIndex(indexName, {
      mappings: {
        properties: {
          firstName: {
            type: 'text',
            analyzer: 'autocomplete_analyzer',
            search_analyzer: 'autocomplete_search_analyzer',
          },
        },
      },
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
    });
  });

  it('should find the new index', async () => {
    const indexCreated = await ES.hasIndex(indexName);

    expect(indexCreated).toBe(true);
  });

  it('should index data using the new index', async () => {
    const itemToIndex = {
      firstName: 'John',
      lastName: 'Doe',
    };

    await ES.indexById(indexName, 'test', itemToIndex);
  });

  // it ('should find indexed data using the new index', async () => {
  //   const data = await ES.search(indexName, {
  //     query: {
  //       match_all : {}
  //     }
  //   });

  //   expect(data.hits.total).toBeGreaterThan(0);
  // });

  it('should delete data using the new index', async () => {
    await ES.deleteByQuery(indexName, {
      match_all: {},
    });
  });

  it('should not find deleted data using the new index', async () => {
    const data = await ES.search(indexName, {
      query: {
        match_all: {},
      },
    });

    expect(data.hits.total).toBe(0);
  });

  it('should delete the new index', async () => {
    await ES.deleteIndex(indexName);
  });

  it('should not find the deleted index', async () => {
    const indexCreated = await ES.hasIndex(indexName);

    expect(indexCreated).toBe(false);
  });
});

afterAll(async () => {
  // cleanup existing indices (drop all the existing data);

  const indices: any[] = await ES.catIndices({ format: 'json' });
  await Promise.all(indices.map((esIndex) => ES.deleteIndex(esIndex.index)));
});
