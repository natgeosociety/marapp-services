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

import {
  computeAreaKm2,
  computeShapeBbox,
  computeShapeCentroid,
  GeoComputeError,
  mergeGeojson,
  normalizeGeojson,
} from '../../src/services/geospatial';
import { readFile } from '../util';

describe('Geospatial', () => {
  const paris = readFile('./fixtures/paris.geojson');
  const china = readFile('./fixtures/china.geojson');
  const canada = readFile('./fixtures/canada.geojson');
  const russia = readFile('./fixtures/russia.geojson');
  const empty = readFile('./fixtures/empty.geojson');
  const polygon = readFile('./fixtures/polygon.geojson');
  const multiPolygon = readFile('./fixtures/multi-polygon.geojson');

  it('should compute geojson bbox', () => {
    const bboxParis = computeShapeBbox(paris);
    const expectedParis = [2.225929, 48.816132, 2.46977, 48.901279];
    expect(bboxParis).toEqual(expectedParis);

    const bboxCanada = computeShapeBbox(canada);
    const expectedCanada = [-141.003006, 41.913319, -52.620281, 83.108322];
    expect(bboxCanada).toEqual(expectedCanada);

    const bboxChina = computeShapeBbox(china);
    const expectedChina = [73.451005, 18.163247, 134.976798, 53.531943];
    expect(bboxChina).toEqual(expectedChina);

    const bboxRussia = computeShapeBbox(russia);
    const expectedRussia = [-180, 41.18678, 180, 81.857324];
    expect(bboxRussia).toEqual(expectedRussia);

    const bboxEmpty = computeShapeBbox(empty);
    const expectedEmpty = [Infinity, Infinity, -Infinity, -Infinity];
    expect(bboxEmpty).toEqual(expectedEmpty);
  });

  it('should compute geojson centroid', () => {
    const centroidParis = computeShapeCentroid(paris);
    const expectedParis = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [2.3506497636815915, 48.85788719154228] },
    };
    expect(centroidParis).toEqual(expectedParis);

    const centroidCanada = computeShapeCentroid(canada);
    const expectedCanada = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [-88.6359731571465, 64.30228148352089] },
    };
    expect(centroidCanada).toEqual(expectedCanada);

    const centroidChina = computeShapeCentroid(china);
    const expectedChina = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [110.65749100717517, 33.4020982951575] },
    };
    expect(centroidChina).toEqual(expectedChina);

    const centroidRussia = computeShapeCentroid(russia);
    const expectedRussia = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [81.60607419428042, 59.20198671487447] },
    };
    expect(centroidRussia).toEqual(expectedRussia);

    const toThrow = () => computeShapeCentroid(empty);
    expect(toThrow).toThrow(GeoComputeError);
  });

  it('should compute area/km2', () => {
    const areaParis = computeAreaKm2(paris);
    expect(areaParis).toEqual(102.85069510423735);

    const areaCanada = computeAreaKm2(canada);
    expect(areaCanada).toEqual(9814710.75347113);

    const areaChina = computeAreaKm2(china);
    expect(areaChina).toEqual(9489016.308574924);

    const areaRussia = computeAreaKm2(russia);
    expect(areaRussia).toEqual(16895792.23321864);

    const areaEmpty = computeAreaKm2(empty);
    expect(areaEmpty).toEqual(0);
  });

  it('should normalize GeoJSON object into a FeatureCollection', () => {
    const expected1 = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: polygon,
        },
      ],
    };
    const feature1 = normalizeGeojson(polygon);
    expect(feature1).toEqual(expected1);

    const expected2 = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: multiPolygon,
        },
      ],
    };
    const feature2 = normalizeGeojson(multiPolygon);
    expect(feature2).toEqual(expected2);
  });

  it('should normalize GeoJSON object with features missing the properties field', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: polygon,
        },
        {
          type: 'Feature',
          geometry: multiPolygon,
        },
      ],
    };
    const expected = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: polygon,
        },
        {
          type: 'Feature',
          properties: {},
          geometry: multiPolygon,
        },
      ],
    };
    const feature = normalizeGeojson(<any>input);
    expect(feature).toEqual(expected);
  });

  it('should have the same bbox, centroid, area/km2 when normalized', () => {
    const featureCollection = normalizeGeojson(multiPolygon);

    const bbox = computeShapeBbox(multiPolygon);
    const bboxFeature = computeShapeBbox(featureCollection);
    expect(bbox).toEqual(bboxFeature);

    const centroid = computeShapeCentroid(multiPolygon);
    const centroidFeature = computeShapeCentroid(featureCollection);
    expect(centroid).toEqual(centroidFeature);

    const areaKm2 = computeAreaKm2(multiPolygon);
    const areaKm2Feature = computeAreaKm2(featureCollection);
    expect(areaKm2).toEqual(areaKm2Feature);
  });

  it('should merge GeoJSON array into a single FeatureCollection', () => {
    expect(paris.features.length).toEqual(20);
    expect(china.features.length).toEqual(34);
    expect(canada.features.length).toEqual(13);
    expect(russia.features.length).toEqual(83);

    const featureCollection1 = mergeGeojson([paris, china]);
    expect(featureCollection1.features.length).toEqual(54);

    const featureCollection2 = mergeGeojson([paris, china, canada, russia]);
    expect(featureCollection2.features.length).toEqual(150);
  });
});
