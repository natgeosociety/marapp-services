import AWS, { SNS } from 'aws-sdk';
import makeError from 'make-error';

import { AWS_REGION, SNS_TOPIC_MANAGER_ARN } from '../config';
import { getLogger } from '../logging';

const sns = new AWS.SNS({ region: AWS_REGION });

export const PublishError = makeError('PublishError');

const logger = getLogger('publish');

export enum OperationTypeEnum {
  CALCULATE = 'calculate',
}

export interface SNSMessage {
  id: string;
  operationType: OperationTypeEnum;
  version: number;
  resources?: string[];
}

/**
 * Publish messages to an Amazon SNS topic.
 * @param message
 * @param raiseError
 */
export const publishSNSMessage = async (message: SNSMessage, raiseError: boolean = true): Promise<string> => {
  const encoded = JSON.stringify(message);

  const params: SNS.Types.PublishInput = {
    Message: encoded,
    TopicArn: SNS_TOPIC_MANAGER_ARN,
  };
  try {
    const response = await sns.publish(params).promise();

    logger.debug(`Message ${response.MessageId} successfully sent to topic: ${params.TopicArn}`);

    return response.MessageId;
  } catch (err) {
    logger.error(err);
    if (raiseError) {
      throw new PublishError(`Could not publish SNS message to topic: ${params.TopicArn}`);
    }
  }
};
