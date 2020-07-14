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

import { Client } from '@elastic/elasticsearch';
import makeError from 'make-error';
import { MongooseDocument } from 'mongoose';

import { ELASTICSEARCH_URI } from '../config';
import { getLogger } from '../logging';

const logger = getLogger();

export const ElasticSearchError = makeError('ElasticSearchError');

export interface ESIndexConfig {
  settings?: {
    analysis?: {
      filter?: object;
      analyzer?: object;
      tokenizer?: object;
    };
  };
  mappings?: {
    properties?: object;
  };
}

export interface SearchService {
  createIndex(indexName: string, indexConfig: ESIndexConfig);
  hasIndex(indexName: string);
  deleteIndex(indexName: string);
  bulkIndex(indexName: string, docs: MongooseDocument[]);
  indexById(indexName: string, id: string, doc: MongooseDocument);
  removeById(indexName: string, id: string);
  search(indexName: string, esQuery: object, from?: number, size?: number);
  catIndices();
}

export class ElasticSearchService implements SearchService {
  constructor(private client = new Client({ node: ELASTICSEARCH_URI, requestTimeout: 5000 })) {}

  /**
   * Create index using native ES config
   * @param indexName
   * @param indexConfig
   */
  async createIndex(indexName: string, indexConfig: ESIndexConfig) {
    try {
      const res = await this.client.indices.create({
        index: indexName,
        body: {
          settings: indexConfig.settings,
          mappings: {
            doc: indexConfig.mappings,
          },
        },
      });
      logger.debug(`es client indices create responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not create index: ${indexName}`);
    }
  }

  /**
   * Check for existing index
   * @param indexName
   */
  async hasIndex(indexName: string): Promise<boolean> {
    try {
      const res = await this.client.indices.exists({ index: indexName });
      logger.debug(`es client indices exists responded with: ${res.statusCode}`);
      return res.statusCode === 200;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not check index: ${indexName}`);
    }
  }

  /**
   * Delete index (including it's documents)
   * @param indexName
   */
  async deleteIndex(indexName: string) {
    try {
      const res = await this.client.indices.delete({ index: indexName });
      logger.debug(`es client indices delete responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not delete index: ${indexName}`);
    }
  }

  /**
   * Index multiple documents at index
   * @param indexName
   * @param docs
   */
  async bulkIndex(indexName: string, docs: MongooseDocument[]) {
    if (!docs.length) {
      return;
    }
    try {
      const res = await this.client.bulk({
        index: indexName,
        type: 'doc',
        body: docs.flatMap((doc) => [
          {
            index: {
              _id: doc.id || doc._id,
            },
          },
          doc,
        ]),
      });
      logger.debug(`es client bulk responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not bulk using index: ${indexName}`);
    }
  }

  /**
   * Index document at index using id
   * @param indexName
   * @param id
   * @param doc
   */
  async indexById(indexName: string, id: string, doc: MongooseDocument) {
    try {
      const res = await this.client.index({
        index: indexName,
        type: 'doc',
        body: doc,
        id,
      });
      logger.debug(`es client index responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not index document: ${id} in index: ${indexName}`);
    }
  }

  /**
   * Remove document at index by id
   * @param indexName
   * @param id
   */
  async removeById(indexName: string, id: string) {
    try {
      const res = await this.client.delete({
        index: indexName,
        type: 'doc',
        id,
      });
      logger.debug(`es client delete responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not remove document: ${id} in index: ${indexName}`);
    }
  }

  /**
   * Perform native ES paginated search based on index & query
   * @param indexName
   * @param esQuery
   * @param from
   * @param size
   */
  async search(indexName: string, esQuery: object, from: number = 0, size: number = 10) {
    try {
      const res = await this.client.search({
        index: indexName,
        type: 'doc',
        body: esQuery,
        from,
        size,
      });
      logger.debug(`es client search responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not search ${indexName}: ${JSON.stringify(esQuery)}`);
    }
  }

  /**
   * Returns high-level information about indices in a cluster.
   */
  async catIndices() {
    try {
      const res = await this.client.cat.indices();
      logger.debug(`es cat indices responded with: ${res.statusCode}`);
      return res;
    } catch (err) {
      logger.error([err.name, JSON.stringify(err.body)].join(': '));
      throw new ElasticSearchError(`Could not cat indices`);
    }
  }
}
