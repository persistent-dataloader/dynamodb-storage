import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import Bluebird from 'bluebird';
import { splitEvery } from 'ramda';

import type { DataLoaderStorage } from 'persistent-dataloader';

const MAX_READ_BATCH_SIZE = 100;

export interface DynamoDBStorageOptions {
  tableName: string;
}

export default class DynamoDBStorage<V> implements DataLoaderStorage<V> {
  private dynamoDb: DocumentClient;

  constructor(private options: DynamoDBStorageOptions) {
    this.dynamoDb = new DocumentClient();
  }

  async batchGet(keys: string[]) {
    const batch = splitEvery(MAX_READ_BATCH_SIZE);

    const results = await Bluebird.map(batch(keys), (batchToGet) => this.dynamoDb.batchGet({
      RequestItems: { [this.options.tableName]: { Keys: batchToGet.map(key => ({ key })) } }
    }).promise());

    const entities = [];

    for (const { Responses } of results) {
      for (const res of Responses[this.options.tableName]) {
        entities.push(res);
      }
    }

    return entities;
  }

  async set(key: string, value: V) {
    await new DocumentClient().put({
      TableName: this.options.tableName,
      Item: { key, value },
    }).promise();

    return value;
  }

  async delete(key: string) {
    await new DocumentClient().delete({
      TableName: this.options.tableName,
      Key: { key },
    }).promise();
  }
}
