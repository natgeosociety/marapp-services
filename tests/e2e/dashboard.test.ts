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

import { globalContext } from '../../src/middlewares/context';
import { expressFactory } from '../../src/middlewares/index';
import { jwtError, jwtRSA } from '../../src/middlewares/jwt';
import DashboardRouter from '../../src/routers/DashboardRouter';

import dashboard from './data/dashboard';

let app;
let newDashboard;

beforeAll(() => {
  app = expressFactory(
    globalContext,
    jwtRSA(false),
    jwtError,
    DashboardRouter.getRouter('/'),
    DashboardRouter.getAdminRouter('/')
  );
});

beforeEach(async (done) => {
  // skip when no app global context
  if (!app.locals.redisClient) {
    return done();
  }

  newDashboard = await dashboard.save(dashboard.create());

  done();
});

afterEach(async (done) => {
  try {
    await dashboard.remove(newDashboard.id);
  } catch (err) {}

  done();
});

describe('GET /dashboards', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app).get('/dashboards').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200, done);
  });
});

describe('GET /management/dashboards', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/dashboards`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

describe('GET /management/dashboards/slug', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/dashboards/slug?keyword=${newDashboard.name}&type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when type param is invalid', (done) => {
    request(app)
      .get(`/management/dashboards/slug?keyword=${newDashboard.name}&type=x`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });

  it('responds with 400 when keyword param is missing', (done) => {
    request(app)
      .get(`/management/dashboards/slug?type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('POST /management/dashboards', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .post(`/management/dashboards`)
      .send(dashboard.create())
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when slug already exists', (done) => {
    request(app)
      .post(`/management/dashboards`)
      .send(newDashboard)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('GET /management/dashboards/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/dashboards/${newDashboard.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .get(`/management/dashboards/${newDashboard.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});

describe('GET /dashboards/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/dashboards/${newDashboard.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .get(`/dashboards/${newDashboard.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});

describe('PUT /management/dashboards/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .put(`/management/dashboards/${newDashboard.id}`)
      .send({ name: 'test' })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when layers are invalid', (done) => {
    request(app)
      .put(`/management/dashboards/${newDashboard.id}`)
      .send({ layers: ['x'] })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('DELETE /management/dashboards/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .delete(`/management/dashboards/${newDashboard.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .delete(`/management/dashboards/${newDashboard.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});
