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

import { expressFactory } from '../../src/middlewares/index';
import { globalContext } from '../../src/middlewares/context';
import { jwtRSA, jwtError } from '../../src/middlewares/jwt';

import MetricRouter from '../../src/routers/MetricRouter';
import LocationRouter from '../../src/routers/LocationRouter';

import metric from './data/metric';
import location from './data/location';

let app;
let newMetric;
let newLocation;

beforeAll(() => {
  app = expressFactory(
    globalContext,
    jwtRSA(false),
    jwtError,
    MetricRouter.getRouter('/'),
    MetricRouter.getAdminRouter('/'),
    LocationRouter.getAdminRouter('/')
  );
});

beforeEach(async (done) => {
  // skip when no app global context
  if (!app.locals.redisClient) {
    return done();
  }

  newLocation = await location.save(location.create());
  newMetric = await metric.save(metric.create({ location: newLocation.id }));

  done();
});

afterEach(async (done) => {
  try {
    await location.remove(newLocation.id);
    await metric.remove(newMetric.id);
  } catch (err) {}

  done();
});

xdescribe('POST /management/metrics/:locationId/action', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .post(`/management/metrics/${newLocation.id}/action?operationType=calculate`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('GET /metrics/:locationId', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/metrics/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('GET /metrics/:locationId/:metricId', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/metrics/${newLocation.id}/${newMetric.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('GET /management/metrics/:locationId', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/metrics/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('GET /management/metrics/:locationId/:metricId', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/metrics/${newLocation.id}/${newMetric.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('POST /management/metrics/:locationId/:metricId/action', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .post(`/management/metrics/${newLocation.id}/${newMetric.id}/action`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('DELETE /management/metrics/:locationId', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .delete(`/management/metrics/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

xdescribe('DELETE /management/metrics/:locationId/:metricId', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .delete(`/management/metrics/${newLocation.id}/:${newMetric.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
