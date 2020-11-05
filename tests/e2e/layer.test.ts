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

import { contextHttp } from '../../src/middlewares/context';
import { expressFactory } from '../../src/middlewares/index';
import { jwtError, jwtRSA } from '../../src/middlewares/jwt';
import LayerRouter from '../../src/routers/LayerRouter';

import layer from './data/layer';

let app;
let newLayer;

beforeAll(() => {
  app = expressFactory(
    contextHttp,
    jwtRSA(false),
    jwtError,
    LayerRouter.getRouter('/'),
    LayerRouter.getAdminRouter('/')
  );
});

beforeEach(async (done) => {
  // skip when no app global context
  if (!app.locals.redisClient) {
    return done();
  }

  newLayer = await layer.save(layer.create());

  done();
});

afterEach(async (done) => {
  try {
    await layer.remove(newLayer.id);
  } catch (err) {}

  done();
});

describe('GET /layers', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app).get('/layers').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200, done);
  });
});

describe('GET /management/layers', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/layers`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

describe('GET /management/layers/slug', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/layers/slug?keyword=${newLayer.name}&type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when type param is invalid', (done) => {
    request(app)
      .get(`/management/layers/slug?keyword=${newLayer.name}&type=x`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });

  it('responds with 400 when keyword param is missing', (done) => {
    request(app)
      .get(`/management/layers/slug?type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('POST /management/layers', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .post(`/management/layers`)
      .send(layer.create())
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when slug already exists', (done) => {
    request(app)
      .post(`/management/layers`)
      .send(newLayer)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('GET /management/layers/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/layers/${newLayer.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .get(`/management/layers/${newLayer.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});

describe('GET /layers/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/layers/${newLayer.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .get(`/layers/${newLayer.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});

describe('PUT /management/layers/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .put(`/management/layers/${newLayer.id}`)
      .send({ name: 'test' })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when category is invalid', (done) => {
    request(app)
      .put(`/management/layers/${newLayer.id}`)
      .send({ category: ['x'] })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('DELETE /management/layers/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .delete(`/management/layers/${newLayer.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .delete(`/management/layers/${newLayer.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});
