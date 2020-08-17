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

const SNS_TOPIC_ARN = '<SNS_TOPIC_ARN>';
const STITCH_AWS_SERVICE = '<STITCH_AWS_SERVICE>';
const STITCH_AWS_SERVICE_REGION = '<STITCH_AWS_SERVICE_REGION>';

/**
 * Realm Functions allow you to define and execute server-side logic for your application.
 * For more details about Realm Functions, see: https://docs.mongodb.com/realm/functions/
 *
 * A Database Trigger will always call a function with a changeEvent.
 * Documentation on ChangeEvents: https://docs.mongodb.com/manual/reference/change-events/
 *
 * Requires the following configuration:
 *  SNS_TOPIC_ARN: AWS SNS topic ARN you want to publish to.
 *  STITCH_AWS_SERVICE: The name of the Stitch 3rd party AWS service.
 *  STITCH_AWS_SERVICE_REGION = The region of the Stitch 3rd party AWS service.
 *
 * @param changeEvent
 */
exports = function (changeEvent) {
  const SNS = context.services.get(STITCH_AWS_SERVICE).sns(STITCH_AWS_SERVICE_REGION);

  const docId = changeEvent['documentKey']['_id'];
  const operationType = changeEvent['operationType'];

  console.log(`Received event: ${operationType}`);

  if (['insert', 'update', 'replace'].indexOf(operationType) !== -1) {
    const doc = changeEvent['fullDocument'];
    const payload = { id: docId, eventType: operationType, version: doc.version };

    if (operationType === 'update') {
      const updatedFields = changeEvent['updateDescription']['updatedFields'];

      // In case of an update event, publish an event only if certain fields were changed;
      if (!('geojson' in updatedFields)) {
        console.log('No changes detected.');
        return;
      }
    }
    const params = {
      Message: JSON.stringify(payload),
      TopicArn: SNS_TOPIC_ARN,
    };
    return SNS.Publish(params)
      .then((data) => {
        console.log(`Successfully published SNS event ${data['MessageId']} for document: ${docId}`);
      })
      .catch((err) => {
        console.error(`Failed to trigger SNS event for document: ${docId}`, err);
      });
  }
};
