/* eslint-disable*/

const elasticsearch = require('@elastic/elasticsearch');
const { v1: uuid } = require('uuid');
const logger = require('../lib/logger');

class ElasticHelper {
  constructor() {
    if (!process.env.AUDIT_INDEX) {
      throw new Error('AUDIT_INDEX NOT SET');
    }

    this.client = new elasticsearch.Client({
      node: this.buildUrl(),
    });
    this.baseIndex = process.env.AUDIT_INDEX;

    this.createIndex(this.baseIndex)
      .then((res) => {
        logger.info('Elasticsearch index created');
      })
      .catch((err) => {
        if (err.message == 'resource_already_exists_exception') return;
        throw new Error(err.message);
      });
  }

  async createIndex(index) {
    let indices = await this.client.indices.exists({
      index,
    });

    if (indices.statusCode == 404) {
      indices = await this.client.indices.create(
        {
          index,
        },
      );
    }
  }

  buildUrl() {
    const credentials = {
      scheme: process.env.ELASTICSEARCH_SCHEME,
      host: process.env.ELASTICSEARCH_HOST,
      port: process.env.ELASTICSEARCH_PORT,
      user: process.env.ELASTICSEARCH_USER,
      pass: process.env.ELASTICSEARCH_PASS,
      url: process.env.ELASTICSEARCH_URL,
    };
    let elasticUrl = '';
    if (credentials.url) elasticUrl = credentials.url;
    else {
      if (!credentials.host && !credentials.port) throw new Error('ELASTICSEARCH_HOST|ELASTICSEARCH_PORT NOT SET. Set them in you .env');

      if (credentials.user && credentials.pass) elasticUrl = `${credentials.scheme}://${credentials.user}:${credentials.pass}@${credentials.host}:${credentials.port}`;
      else elasticUrl = `${credentials.scheme}://${credentials.host}:${credentials.port}`;
    }
    return elasticUrl;
  }

  create(body) {
    return this.client.index({
      index: this.baseIndex,
      id: uuid(),
      body,
    });
  }

  update(body) {
    return this.client.update({
      index: this.baseIndex,
      body,
    });
  }

  async findOne(body) {
    body.size = 1;
    const search = await this.client.search({
      index: this.baseIndex,
      body,
    });
    return search.body.hits.hits[0] && search.body.hits.hits[0]._source || null;
  }

  async search(body) {
    try {
      const search = await this.client.search({
        index: this.baseIndex,
        body,
      });

      // return search;
      if (body.size == 1) return search && search.body && search.body.hits && search.body.hits.hits[0] && search.body.hits.hits[0]._source;

      return {
        total: search.body.hits.total || search.body.hits.total.value,
        aggregations: search.body.aggregations,
        pages: Math.ceil(search.body.hits.total/body.size) || Math.ceil(search.body.hits.total.value/body.size),
        data: search.body.hits.hits.map((res) => ({
          id: res._id,
          ...res._source,
        })),
      };
    } catch (e) {
      throw new Error(e.message);
    }
  }

  searchWithQuery(type, query = {}, from, size) {
    return this.client.search({
      index: this.baseIndex,
      type,
      body: {
        from,
        size,
        query: {
          match: '',
        },
      },
    });
  }

  massInsert(body) {
    return this.client.bulk({
      // here we are forcing an index refresh,
      // otherwise we will not get any result
      // in the consequent search
      refresh: true,
      body,
    });
  }

  deleteIndex() {
    return this.client.indices.delete({
      index: this.baseIndex,
    });
  }

  async delete(type, id) {
    const res = await this.client.delete({
      index: this.baseIndex,
      id,
    });
    return res.body.result == 'deleted';
  }

  getIndex() {
    return this.baseIndex;
  }


  appendMultiplePropertyMatch(query) {
    const tempArray = [];
    const keys = Object.keys(query);
    if (keys.length !== 0 && query.constructor === Object) {
      for (const key of keys) {
        tempArray.push({
          match: {
            [key]: query[key],
          },
        });
      }

      logger.info(tempArray);
    }
    return tempArray;
  }

  appendTerms(key, terms = []) {
    /**
         * "terms" basically works like the WHERE IN query in SQL and NOSQL languages
         *
         * e.g
         * "terms": {
                		"productId": [ "5d3af86cfc8d8e5bf0a889bd", "5d383117b38013381b68d7cb" ]
             }
         */
    if (terms && terms.length > 0) {
      return {
        terms: {
          [key]: terms,
        },
      };
    }

    return null;
  }

  appendSort(key = 'updatedAt', order = 'desc', unmapped_type = 'date') {
    return [
      {
        [key]: {
          order,
          unmapped_type,
        },
      },
    ];
  }


  appendSum(fieldName = 'amount', field = 'amount') {
    return {
      [fieldName]: { sum: { field } },
    };
  }

  appendDateRange(key, dateFrom, dateTo) {
    /**
         * This will create a date range query for fetching the data
         */
    if (dateFrom && dateTo) {
      return {
        range: {
          [key]: {
            from: dateFrom,
            to: dateTo,
          },
        },
      };
    }
  }

  appendDateHistogram(body, field, interval = 'day', includeSum = false, innerAggName = 'amount', sumField = 'amount') {
    body.aggs = {
      data_over_time: {
        date_histogram: {
          field,
          interval: interval || 'day',
        },
      },
    };
    if (includeSum) {
      body.aggs.data_over_time.aggs = {
        [innerAggName]: {
          sum: {
            field: sumField,
          },
        },
      };
    }

    return body;
  }

  takeOnlyRecent(body, field, sortKey = 'updatedAt', sortType = 'desc') {
    body.collapse = {
      field,
      inner_hits: {
        name: 'most_recent',
        size: 1,
        sort: [{
          [sortKey]: sortType,
        }],
      },
    };
    if (!body.aggs) body.aggs = {};
    body.aggs.total = {
      cardinality: {
        field,
      },
    };
    return body;
  }

  async executeTakeOnlyOneRecent(body, field, sortKey = 'createdAt', sortType = 'desc') {
    try {
      body.collapse = {
        field,
        inner_hits: {
          name: 'most_recent',
          size: 1,
          sort: [{
            [sortKey]: sortType,
          }],
        },
      };

      logger.info('Query', body);

      // return body;

      const search = await this.client.search({
        index: this.baseIndex,
        body,
      });
      return search.body.hits.hits[0]
                && search.body.hits.hits[0].inner_hits
                && search.body.hits.hits[0].inner_hits.most_recent
                && search.body.hits.hits[0].inner_hits.most_recent.hits
                && search.body.hits.hits[0].inner_hits.most_recent.hits.hits[0]
                && search.body.hits.hits[0].inner_hits.most_recent.hits.hits[0]._source || null;
    } catch (e) {
      logger.info('executeTakeOnlyOneRecent', e);
      return null;
    }
  }
}

module.exports = ElasticHelper;
