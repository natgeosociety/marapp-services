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

import request from 'supertest';

import { expressFactory } from '../../src/middlewares';
import { contextHttp } from '../../src/middlewares/context';
import { jwtError, jwtRSA } from '../../src/middlewares/jwt';
import LocationRouter from '../../src/routers/LocationRouter';
import MetricRouter from '../../src/routers/MetricRouter';

import location from './data/location';
import metric from './data/metric';

let app;
let newMetric;
let newLocation;

beforeAll(async () => {
  app = expressFactory(
    contextHttp,
    jwtRSA(false),
    jwtError,
    MetricRouter.getRouter('/'),
    MetricRouter.getAdminRouter('/'),
    LocationRouter.getAdminRouter('/')
  );
});

beforeEach(async () => {
  // skip when no app global context
  if (!app.locals.redisClient) {
    return;
  }
  newLocation = await location.save(location.create());
  newMetric = await metric.save(metric.create({ location: newLocation.id }));
});

afterEach(async () => {
  try {
    await location.remove(newLocation.id);
    await metric.remove(newMetric.id);
  } catch (err) {}
});

describe('POST /management/metrics/:locationId/action', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .post(`/management/metrics/${newLocation.id}/action?operationType=calculate`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('GET /metrics/:locationId', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/metrics/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('GET /metrics/:locationId/:metricId', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/metrics/${newLocation.id}/${newMetric.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('GET /management/metrics/:locationId', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/management/metrics/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('GET /management/metrics/:locationId/:metricId', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/management/metrics/${newLocation.id}/${newMetric.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('POST /management/metrics/:locationId/:metricId/action', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .post(`/management/metrics/${newLocation.id}/${newMetric.id}/action`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('DELETE /management/metrics/:locationId', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .delete(`/management/metrics/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe('DELETE /management/metrics/:locationId/:metricId', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .delete(`/management/metrics/${newLocation.id}/:${newMetric.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});
