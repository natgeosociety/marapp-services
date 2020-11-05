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

import { Layer, LayerCategoryEnum, LayerModel, LayerProviderEnum, LayerTypeEnum } from '../../../src/models/LayerModel';
import { removeById, save } from '../../../src/models/utils/index';

export default {
  create: (data?: Partial<Layer>): Layer => ({
    slug: `test-layer-${Math.floor(Math.random() * 100000)}`,
    name: 'new layer',
    description: 'new layer description',
    type: LayerTypeEnum.RASTER,
    provider: LayerProviderEnum.MAPBOX,
    category: [LayerCategoryEnum.BIODIVERSITY],
    config: {
      source: {
        assetId: 'projects/assets/layers/gridded_livestock_goats_2010',
        maxNativeZoom: 13,
        maxzoom: 19,
        minNativeZoom: 4,
        minzoom: 2,
        sldValue:
          '<RasterSymbolizer><ColorMap type="ramp" extended="false" ><ColorMapEntry color="#ffffcc" quantity="0" opacity="1" label="0"/><ColorMapEntry color="#f8f8bf" quantity="10" opacity="1" label="10"/><ColorMapEntry color="#f1f194" quantity="100" opacity="1" label="100"/><ColorMapEntry color="#ffeda0" quantity="1000" opacity="1" label="1000" /><ColorMapEntry color="#feb24c" quantity="10000" opacity="1" label="10000" /><ColorMapEntry color="#ed4827" quantity="100000" opacity="1" label="100000" /></ColorMap></RasterSymbolizer>',
        styleType: 'sld',
        tiles: ['https://domain.com/services/api/v1/tiles/e5571c3c-f252-4084-baf9-6b0521ba96f5/{z}/{x}/{y}'],
        params_config: [],
        type: 'raster',
      },
      legendConfig: {
        items: [
          {
            color: '#ffffcc',
            value: '0',
          },
          {
            color: '#f8f8bf',
            value: '10',
          },
          {
            color: '#f1f194',
            value: '100',
          },
          {
            color: '#ffeda0',
            value: '1000',
          },
          {
            color: '#feb24c',
            value: '10000',
          },
          {
            color: '#ed4827',
            value: '100000',
          },
        ],
        type: 'gradient',
      },
      interactionConfig: {},
      applicationConfig: {
        active: true,
        default: true,
        global: true,
        metadata: 'livestock',
      },
      staticImageConfig: {},
    },
    primary: true,
    published: true,
    organization: 'MARAPP',
    // references: ['']
    ...data,
  }),
  save: (layer: Layer): Promise<any> => save(LayerModel, new LayerModel(layer)),
  remove: (layerId: string): Promise<any> => removeById(LayerModel, layerId),
};
