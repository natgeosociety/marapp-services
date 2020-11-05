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

import CollectionRouter from '../../src/routers/CollectionRouter';

import collection from './data/collection';

let app;
let newCollection;

beforeAll(() => {
  app = expressFactory(
    globalContext,
    jwtRSA(false),
    jwtError,
    CollectionRouter.getRouter('/'),
    CollectionRouter.getAdminRouter('/')
  );
});

beforeEach(async (done) => {
  // skip when no app global context
  if (!app.locals.redisClient) {
    return done();
  }

  newCollection = await collection.save(collection.create());

  done();
});

afterEach(async (done) => {
  try {
    await collection.remove(newCollection.id);
  } catch (err) {}

  done();
});

describe('GET /collections', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app).get('/collections').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200, done);
  });
});

describe('GET /management/collections', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/collections`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

describe('GET /management/collections/slug', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/collections/slug?keyword=${newCollection.name}&type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when type param is invalid', (done) => {
    request(app)
      .get(`/management/collections/slug?keyword=${newCollection.name}&type=x`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });

  it('responds with 400 when keyword param is missing', (done) => {
    request(app)
      .get(`/management/collections/slug?type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('POST /management/collections', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .post(`/management/collections`)
      .send(collection.create())
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when slug already exists', (done) => {
    request(app)
      .post(`/management/collections`)
      .send(newCollection)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('GET /management/collections/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/management/collections/${newCollection.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .get(`/management/collections/${newCollection.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});

describe('GET /collections/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .get(`/collections/${newCollection.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .get(`/collections/${newCollection.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});

describe('PUT /management/collections/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .put(`/management/collections/${newCollection.id}`)
      .send({ name: 'test' })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 400 when location are valid', (done) => {
    request(app)
      .put(`/management/collections/${newCollection.id}`)
      .send({ locations: ['x'] })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400, done);
  });
});

describe('DELETE /management/collections/:id', () => {
  it('responds with 200 when params are valid', (done) => {
    request(app)
      .delete(`/management/collections/${newCollection.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('responds with 404 when id does not exist', (done) => {
    request(app)
      .delete(`/management/collections/${newCollection.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404, done);
  });
});
