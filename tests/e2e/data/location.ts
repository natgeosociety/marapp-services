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

import { Location, LocationModel, LocationTypeEnum } from '../../../src/models/LocationModel';
import { save, removeById } from '../../../src/models/utils/index';

export default {
  create: (data?: Partial<Location>): Location => ({
    slug: `test-location-${Math.floor(Math.random() * 100000)}`,
    name: 'test location',
    description: 'test location description',
    type: LocationTypeEnum.JURISDICTION,
    geojson: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [22.74169921875, 47.11499982620772],
                [22.96142578125, 46.37725420510028],
                [24.3017578125, 46.649436163350245],
                [24.41162109375, 47.11499982620772],
                [23.356933593749996, 47.42808726171425],
                [22.74169921875, 47.11499982620772],
              ],
            ],
          },
        },
      ],
    },
    featured: false,
    published: true,
    organization: 'MARAPP',
    ...data,
  }),
  save: (location: Location): Promise<any> => save(LocationModel, new LocationModel(location)),
  remove: (locationId: string): Promise<any> => removeById(LocationModel, locationId),
};
