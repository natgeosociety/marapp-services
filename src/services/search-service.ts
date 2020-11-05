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

const ElasticSearchError = makeError('ElasticSearchError');

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
  bulkIndex(indexName: string, docs: MongooseDocument[] | any[]);
  indexById(indexName: string, id: string, doc: MongooseDocument | any);
  removeById(indexName: string, id: string);
  search(indexName: string, esQuery: object, from?: number, size?: number);
  deleteByQuery(indexName: string, esQuery: object);
  catIndices(options?: object);
}

export class ElasticSearchService implements SearchService {
  constructor(private client = new Client({ node: ELASTICSEARCH_URI, requestTimeout: 5000 })) {}

  /**
   * Create index using native ES config
   * @param indexName: A comma-separated list of index names to search
   * @param indexConfig: The configuration for the index (settings and mappings)
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
      logger.debug('[createIndex] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[createIndex] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not create index.');
    }
  }

  /**
   * Check for existing index
   * @param indexName: A comma-separated list of index names to search
   */
  async hasIndex(indexName: string): Promise<boolean> {
    try {
      const res = await this.client.indices.exists({ index: indexName });
      logger.debug('[hasIndex] client responded with: %s', res.statusCode);
      return res.statusCode === 200;
    } catch (err) {
      logger.error('[hasIndex] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not check index.');
    }
  }

  /**
   * Delete index (including it's documents)
   * @param indexName: A comma-separated list of index names to search
   */
  async deleteIndex(indexName: string) {
    try {
      const res = await this.client.indices.delete({ index: indexName });
      logger.debug('[deleteIndex] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[deleteIndex] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not delete index.');
    }
  }

  /**
   * Index multiple documents at index
   * @param indexName: A comma-separated list of index names to search
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
      logger.debug('[bulkIndex] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[bulkIndex] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not bulk index documents.');
    }
  }

  /**
   * Index document at index using id
   * @param indexName: A comma-separated list of index names to search
   * @param id: Document ID
   * @param doc: The document
   */
  async indexById(indexName: string, id: string, doc: MongooseDocument | any) {
    try {
      const res = await this.client.index({
        index: indexName,
        type: 'doc',
        body: doc,
        id,
      });
      logger.debug('[indexById] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[indexById] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not index document.');
    }
  }

  /**
   * Remove document at index by id
   * @param indexName: A comma-separated list of index names to search
   * @param id: Document ID
   */
  async removeById(indexName: string, id: string) {
    try {
      const res = await this.client.delete({
        index: indexName,
        type: 'doc',
        id,
      });
      logger.debug('[removeById] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[removeById] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not remove document.');
    }
  }

  /**
   * Perform native ES paginated search based on index & query
   * @param indexName: A comma-separated list of index names to search
   * @param esQuery: The search definition using the Query DSL
   * @param from: Starting offset (default: 0)
   * @param size: Number of hits to return (default: 10)
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
      logger.debug('[search] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[search] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not search documents.');
    }
  }

  /**
   * Returns high-level information about indices in a cluster.
   * @param options: Cat indices options
   */
  async catIndices(options) {
    try {
      const res = await this.client.cat.indices(options);
      logger.debug('[catIndices] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[catIndices] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not cat indices.');
    }
  }

  /**
   * Deletes documents that match the specified query.
   * @param indexName: A comma-separated list of index names to search
   * @param esQuery: The search definition using the Query DSL
   */
  async deleteByQuery(indexName: string, esQuery: object) {
    try {
      const res = await this.client.deleteByQuery({
        index: indexName,
        type: 'doc',
        body: { query: esQuery },
      });
      logger.debug('[deleteByQuery] client responded with: %s', res.statusCode);
      return res.body;
    } catch (err) {
      logger.error('[deleteByQuery] %s: %s', err.name, JSON.stringify(err.body));
      throw new ElasticSearchError('Could not delete by query.');
    }
  }
}
