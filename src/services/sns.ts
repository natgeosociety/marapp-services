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

import AWS, { SNS } from 'aws-sdk';
import makeError from 'make-error';

import { AWS_REGION, SNS_TOPIC_MANAGER_ARN, SNS_TOPIC_WIPE_DATA_ARN } from '../config';
import { getLogger } from '../logging';

const sns = new AWS.SNS({ region: AWS_REGION });

export const PublishError = makeError('PublishError');

const logger = getLogger('publish');

export enum OperationTypeEnum {
  CALCULATE = 'calculate',
}

export interface SNSComputeMetricEvent {
  id: string;
  operationType: OperationTypeEnum;
  version: number;
  resources?: string[];
}

export interface SNSWipeDataEvent {
  organizationId: string;
  organizationName: string;
}

/**
 * Publish messages to an Amazon SNS topic.
 * @param message
 * @param topicArn
 * @param raiseError
 */
const publishSNSMessage = async (
  message: { [key: string]: any },
  topicArn: string,
  raiseError: boolean = true
): Promise<string> => {
  const encoded = JSON.stringify(message);

  const params: SNS.Types.PublishInput = {
    Message: encoded,
    TopicArn: topicArn,
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

export const triggerComputeMetricEvent = async (
  message: SNSComputeMetricEvent,
  raiseError: boolean = true
): Promise<string> => {
  return publishSNSMessage(message, SNS_TOPIC_MANAGER_ARN, raiseError);
};

export const triggerWipeDataEvent = async (message: SNSWipeDataEvent, raiseError: boolean = true): Promise<string> => {
  return publishSNSMessage(message, SNS_TOPIC_WIPE_DATA_ARN, raiseError);
};
