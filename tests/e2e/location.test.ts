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

import location from './data/location';

let app;
let newLocation;

beforeAll(async () => {
  app = expressFactory(
    contextHttp,
    jwtRSA(false),
    jwtError,
    LocationRouter.getRouter('/'),
    LocationRouter.getAdminRouter('/')
  );
});

beforeEach(async () => {
  // skip when no app global context
  if (!app.locals.redisClient) {
    return;
  }
  newLocation = await location.save(location.create());
});

afterEach(async () => {
  try {
    await location.remove(newLocation.id);
  } catch (err) {}
});

describe('GET /locations', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app).get('/locations').set('Accept', 'application/json').expect('Content-Type', /json/).expect(200);
  });
});

describe('GET /management/locations', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/management/locations`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});

describe(`GET /management/locations/slug`, () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/management/locations/slug?keyword=${newLocation.name}&type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('responds with 400 when type param is invalid', async () => {
    await request(app)
      .get(`/management/locations/slug?keyword=${newLocation.name}&type=x`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400);
  });

  it('responds with 400 when keyword param is missing', async () => {
    await request(app)
      .get(`/management/locations/slug?type=shortid`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400);
  });
});

describe('POST /management/locations', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .post(`/management/locations`)
      .send(location.create())
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('responds with 400 when slug already exists', async () => {
    await request(app)
      .post(`/management/locations`)
      .send(newLocation)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400);
  });
});

describe('GET /management/locations/:id', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/management/locations/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('responds with 404 when id does not exist', async () => {
    await request(app)
      .get(`/management/locations/${newLocation.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404);
  });
});

describe('GET /locations/:id', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .get(`/locations/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('responds with 404 when id does not exist', async () => {
    await request(app)
      .get(`/locations/${newLocation.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404);
  });
});

describe('PUT /management/locations/:id', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .put(`/management/locations/${newLocation.id}`)
      .send({ name: 'test' })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('responds with 400 when type is invalid', async () => {
    await request(app)
      .put(`/management/locations/${newLocation.id}`)
      .send({ type: 'x' })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400);
  });
});

describe('DELETE /management/locations/:id', () => {
  it('responds with 200 when params are valid', async () => {
    await request(app)
      .delete(`/management/locations/${newLocation.id}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('responds with 404 when id does not exist', async () => {
    await request(app)
      .delete(`/management/locations/${newLocation.id.split('').reverse().join('')}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404);
  });
});
