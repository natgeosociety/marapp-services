import { isEmpty, pick, set } from 'lodash';
import { MongooseDocument, Schema } from 'mongoose';

import { ES_INDEX_PREFIX } from '../../config';
import { getLogger } from '../../logging';
import { ElasticSearchService, ESIndexConfig } from '../../services/search-service';

export interface IESPlugin {
  esSync?(): Promise<any>;
  esSearch?(esQuery: object, from: number, size: number): Promise<any>;
  esSearchOnlyIds?(query_string: string, filterBy?: { [key: string]: any }, fields?: string[]): Promise<string[]>;
  esSearchOnlyIdsAndAggs?(
    query_string: string,
    field: string,
    filterBy?: { [key: string]: any },
    fields?: string[]
  ): Promise<any>;
}

const logger = getLogger();

export default (schema: Schema, options: ESIndexConfig) => {
  const searchService = new ElasticSearchService();

  schema.post('save', async function (doc) {
    const modelName: string = this.constructor.modelName;
    const indexName: string = [ES_INDEX_PREFIX, modelName.toLowerCase()].filter((e) => !!e).join('-');
    const docId: string = doc.id || doc._id;

    const fieldsToIndex: string[] = Object.keys(options.mappings.properties);
    const partial = <MongooseDocument>pick(doc, fieldsToIndex);

    if (!(await searchService.hasIndex(indexName))) {
      logger.debug(`creating es index for model: ${modelName}`);

      await searchService.createIndex(indexName, options);
    }
    logger.debug(`updating es document: ${docId}`);

    return searchService.indexById(indexName, docId, partial);
  });

  schema.post('remove', async function (doc) {
    const modelName: string = this.constructor.modelName;
    const indexName: string = [ES_INDEX_PREFIX, modelName.toLowerCase()].filter((e) => !!e).join('-');
    const docId: string = doc.id || doc._id;

    logger.debug(`removing es document: ${docId}`);

    return searchService.removeById(indexName, docId);
  });

  schema.statics.esSync = async function () {
    const modelName: string = this.modelName;
    const indexName: string = [ES_INDEX_PREFIX, modelName.toLowerCase()].filter((e) => !!e).join('-');

    if (await searchService.hasIndex(indexName)) {
      logger.debug(`deleting es index for model: ${modelName}`);

      await searchService.deleteIndex(indexName);
    }
    await searchService.createIndex(indexName, options);

    const fieldsToSelect: string = Object.keys(options.mappings.properties).join(' ');
    const docsToIndex: MongooseDocument[] = await this.model(modelName).find({}, fieldsToSelect);

    return searchService.bulkIndex(indexName, docsToIndex);
  };

  schema.statics.esSearch = async function (esQuery: object, from: number = 0, size: number = 10) {
    const modelName: string = this.modelName;
    const indexName: string = [ES_INDEX_PREFIX, modelName.toLowerCase()].filter((e) => !!e).join('-');

    return searchService.search(indexName, esQuery, from, size);
  };

  schema.statics.esSearchOnlyIds = async function (
    query_string: string,
    filterBy: { [key: string]: any } = {},
    fields: string[] = ['name']
  ) {
    if (!query_string) {
      return;
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
      const data = await this.esSearch({ _source: false, query }, 0, 10000);
      return data.body.hits.hits.map((hit) => hit._id);
    } catch (err) {
      logger.error(err);
      return [];
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

      result.ids = data.body.hits.hits.map((hit) => hit._id);
      result.aggs = data.body.aggregations.default.buckets;
    } catch (err) {
      logger.error(err);
    }

    return result;
  };
};
