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

import { isEmpty, pick, set } from 'lodash';
import { MongooseDocument, Schema } from 'mongoose';

import { ES_INDEX_PREFIX } from '../../config';
import { getLogger } from '../../logging';
import { ElasticSearchService, ESIndexConfig } from '../../services/search-service';

const logger = getLogger();

export interface IESPlugin {
  esSync?(): Promise<any>;
  esSearch?(esQuery: object, from: number, size: number): Promise<any>;
  esSearchOnlyIds?(query_string: string, filterBy?: { [key: string]: any }, fields?: string[]): Promise<object>;
  esSearchOnlyIdsAndAggs?(
    query_string: string,
    field: string,
    filterBy?: { [key: string]: any },
    fields?: string[]
  ): Promise<any>;
  esDeleteByQuery?(esQuery: object): Promise<any>;
}

export default (schema: Schema, options: ESIndexConfig) => {
  const searchService = new ElasticSearchService();

  schema.post('save', async function (doc) {
    const modelName: string = this.constructor.modelName;
    const indexName: string = modelToEsIndex(modelName);
    const docId: string = doc.id || doc._id;

    logger.debug('[post-save] indexing es document: %s', docId);

    const fieldsToIndex: string[] = Object.keys(options.mappings.properties);
    const partial = <MongooseDocument>pick(doc, fieldsToIndex);

    if (!(await searchService.hasIndex(indexName))) {
      logger.debug('[post-save] creating es index: %s', indexName);
      await searchService.createIndex(indexName, options);
    }

    logger.debug('[post-save] updating es document: %s', docId);
    return searchService.indexById(indexName, docId, partial);
  });

  schema.post('remove', async function (doc) {
    const modelName: string = this.constructor.modelName;
    const indexName: string = modelToEsIndex(modelName);
    const docId: string = doc.id || doc._id;

    logger.debug('[post-remove] removing es document: %s', docId);
    return searchService.removeById(indexName, docId);
  });

  schema.statics.esSync = async function () {
    const modelName: string = this.modelName;
    const indexName: string = modelToEsIndex(modelName);

    if (await searchService.hasIndex(indexName)) {
      logger.debug('[esSync] deleting es index: %s', indexName);
      await searchService.deleteIndex(indexName);
    }

    logger.debug('[esSync] creating es index: %s', indexName);
    await searchService.createIndex(indexName, options);

    const fieldsToSelect: string = Object.keys(options.mappings.properties).join(' ');
    const docsToIndex: MongooseDocument[] = await this.model(modelName).find({}, fieldsToSelect);

    return searchService.bulkIndex(indexName, docsToIndex);
  };

  schema.statics.esSearch = async function (esQuery: object, from: number = 0, size: number = 10) {
    const indexName: string = modelToEsIndex(this.modelName);

    logger.debug('[esSearch] searching es index %s: %O', indexName, esQuery);
    return searchService.search(indexName, esQuery, from, size);
  };

  schema.statics.esSearchOnlyIds = async function (
    query_string: string,
    filterBy: { [key: string]: any } = {},
    fields: string[] = ['name']
  ) {
    if (!query_string) {
      return {};
    }
    let query = {
      bool: {
        must: {
          multi_match: {
            query: query_string,
            operator: 'and',
            fields: fields,
          },
        },
      },
    };
    if (!isEmpty(filterBy)) {
      const filters = {
        bool: {
          should: Object.entries(filterBy)
            .map(([k, v]) => (Array.isArray(v) ? v.map((_) => ({ term: { [k]: _ } })) : { term: { [k]: v } }))
            .flat(),
        },
      };
      set(query, ['bool', 'filter'], filters);
    }
    try {
      const data = await this.esSearch(
        {
          _source: false,
          query,
          highlight: {
            pre_tags: ['{{'],
            post_tags: ['}}'],
            fields: fields.reduce((a, c) => (a[c] = {}) && a, {}),
          },
        },
        0,
        10000
      );
      logger.debug('[esSearchOnlyIds] found %s documents for query: %O', data.hits.hits.length, query);

      return data.hits.hits.reduce((result, { _id, highlight }) => {
        result[_id] = Object.keys(highlight).reduce((a, c) => {
          a[c] = highlight[c][0];
          return a;
        }, {});

        return result;
      }, {});
    } catch (err) {
      logger.error(err);
      return {};
    }
  };

  schema.statics.esSearchOnlyIdsAndAggs = async function (
    query_string: string,
    field: string,
    filterBy: { [key: string]: any } = {},
    fields: string[] = ['name']
  ) {
    let query = {
      bool: {
        must: {
          multi_match: {
            query: query_string,
            operator: 'and',
            fields,
          },
        },
      },
    };
    if (!isEmpty(filterBy)) {
      const filters = Object.entries(filterBy).map(([k, v]) => ({ term: { [k]: v } }));
      set(query, ['bool', 'filter'], filters);
    }

    const result = { ids: [], aggs: [] };
    try {
      const data = await this.esSearch(
        {
          _source: false,
          query,
          aggs: {
            default: {
              terms: {
                field,
                min_doc_count: 0,
              },
            },
          },
        },
        0,
        10000
      );
      logger.debug('[esSearchOnlyIdsAndAggs] found %s documents for query: %O', data.hits.hits.length, query);

      result.ids = data.hits.hits.map((hit) => hit._id);
      result.aggs = data.aggregations.default.buckets;
    } catch (err) {
      logger.error(err);
    }
    return result;
  };

  schema.statics.esDeleteByQuery = async function (esQuery: { [key: string]: any } = {}) {
    const indexName: string = modelToEsIndex(this.modelName);
    if (isEmpty(esQuery)) {
      return false;
    }
    let success: boolean = true;
    try {
      const query = {
        match: esQuery,
      };
      const data = await searchService.deleteByQuery(indexName, query);
      logger.debug('[esDeleteByQuery] deleted %s out of %s documents for query: %O', data.deleted, data.total, esQuery);
    } catch (err) {
      logger.error(err);
      success = false;
    }
    return success;
  };
};

/**
 * Helper function.
 * @param modelName
 * @param indexPrefix
 * @param sep
 */
const modelToEsIndex = (modelName: string, indexPrefix: string = ES_INDEX_PREFIX, sep: string = '-'): string =>
  [indexPrefix, modelName.toLowerCase()].filter(Boolean).join(sep);
