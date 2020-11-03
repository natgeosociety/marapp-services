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

import { Widget } from '../../../src/models/WidgetModel';

export default (data?: Widget): Widget => ({
  slug: `test-widget-${Math.floor(Math.random() * 1000)}`,
  name: 'new widget',
  config: {
    widgetConfig: {
      paramsConfig: [
        {
          key: 'slug',
          required: true,
        },
      ],
      sentence: {
        default:
          'From {start_year} to {end_year}, {location} lost {loss_total_area} of tree cover, equivalent to a {loss_total_perc} decrease in tree cover since {first_year}',
      },
    },
  },
  metrics: ['tree-loss'],
  // layers: ['']
  ...data,
});
