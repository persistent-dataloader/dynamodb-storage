import AWS, { AWSError } from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

import DynamoDBStorage from '../src';

describe('DynamoDBStorage tests', () => {
  beforeAll(() => {
    AWSMock.setSDKInstance(AWS);
  });

  it('Should be instantiated with no error', async () => {
    const constructor = () => new DynamoDBStorage({ tableName: 'test' });
    expect(constructor).not.toThrow();
  });

  it('Should get empty array', async () => {
    const spy = jest.fn().mockImplementationOnce((params: DocumentClient.BatchGetItemInput, callback?: (err: AWSError, data: DocumentClient.BatchGetItemOutput) => void) => {
      callback(null, { Responses: { [Object.keys(params.RequestItems)[0]]: [] } });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'batchGet', spy);

    const result = await new DynamoDBStorage({ tableName: 'test' }).batchGet([]);

    expect(spy).toHaveBeenCalledTimes(0);
    expect(result).toHaveLength(0);

    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('Should get single item', async () => {
    const spy = jest.fn().mockImplementationOnce((params: DocumentClient.BatchGetItemInput, callback?: (err: AWSError, data: DocumentClient.BatchGetItemOutput) => void) => {
      callback(null, { Responses: { [Object.keys(params.RequestItems)[0]]: [{ key: 'some_key', value: 'some_value' }] } });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'batchGet', spy);

    const result = await new DynamoDBStorage({ tableName: 'test' }).batchGet(['some_key']);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ RequestItems: { test: { Keys: [{ key: 'some_key' }] } } }, expect.any(Function));
    expect(result).toHaveLength(1);
    expect(result).toEqual([{ key: 'some_key', value: 'some_value' }]);

    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('Should get 105 items', async () => {
    const spy = jest.fn()
      .mockImplementationOnce((params: DocumentClient.BatchGetItemInput, callback?: (err: AWSError, data: DocumentClient.BatchGetItemOutput) => void) => {
        callback(null, { Responses: { [Object.keys(params.RequestItems)[0]]: Array(100).fill(0).map((v, i) => ({ key: `key_${i + v + 1}`, value: 'some_value' })) } });
      })
      .mockImplementationOnce((params: DocumentClient.BatchGetItemInput, callback?: (err: AWSError, data: DocumentClient.BatchGetItemOutput) => void) => {
        callback(null, { Responses: { [Object.keys(params.RequestItems)[0]]: Array(5).fill(100).map((v, i) => ({ key: `key_${i + v + 1}`, value: 'some_value' })) } });
      });
    AWSMock.mock('DynamoDB.DocumentClient', 'batchGet', spy);

    const result = await new DynamoDBStorage({ tableName: 'test' }).batchGet(Array(105).fill(0).map((v, i) => `key_${i + v + 1}`));

    expect(spy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(105);
    expect(result).toEqual(expect.arrayContaining([
      { key: 'key_1', value: 'some_value' },
      { key: 'key_105', value: 'some_value' }
    ]));

    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('Should set value by key', async () => {
    const spy = jest.fn().mockImplementationOnce((_: DocumentClient.PutItemInput, callback?: (err: AWSError, data: DocumentClient.PutItemOutput) => void) => {
      callback(null, {});
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'put', spy);

    const result = await new DynamoDBStorage({ tableName: 'test' }).set('some_key', 'some_value');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      TableName: 'test',
      Item: { key: 'some_key', value: 'some_value' },
    }, expect.any(Function));
    expect(result).toEqual('some_value');

    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('Should delete value by key', async () => {
    const spy = jest.fn().mockImplementationOnce((_: DocumentClient.DeleteItemInput, callback?: (err: AWSError, data: DocumentClient.DeleteItemOutput) => void) => {
      callback(null, {});
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'delete', spy);

    await new DynamoDBStorage({ tableName: 'test' }).delete('some_key');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      TableName: 'test',
      Key: { key: 'some_key' },
    }, expect.any(Function));

    AWSMock.restore('DynamoDB.DocumentClient');
  });
});
