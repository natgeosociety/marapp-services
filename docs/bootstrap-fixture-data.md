# Data management

Swagger documentation available at: `/services/api/v1/docs/`

Management endpoints are available for all data model types.
- locations
- collections
- metrics
- layers
- widgets
- dashboards

## Adding Location data

- endpoint : `/services/api/v1/docs/#/locations-management/addLocation`

![](resources/adding-locations.png)

#### Required format

```
{
    slug: string;           (required, unique)
    name: string;           (required)
    description: string;    (optional)
    type: string;           (required, choices: Continent|Country|Jurisdiction|Biome|Protected Area|Species Area)
    geojson: object;        (required, see: https://tools.ietf.org/html/rfc7946)
    published: boolean;     (required)
    featured: boolean;      (required)
}
```

Sample request:
```
curl -X POST '<HOSTNAME>/services/api/v1/management/locations?group=<GROUP>' \
  -H 'authorization: Bearer <TOKEN>' \
  -H 'content-type: application/json;charset=UTF-8' \
  --data-binary '{"slug":"springfield","name":"Springfield","description":"Springfield (The Simpsons)","type":"Jurisdiction","featured":true,"published":true,"geojson":{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-484.02465820312494,42.04113400940807],[-477.015380859375,42.04113400940807],[-477.015380859375,45.537136680398596],[-484.02465820312494,45.537136680398596],[-484.02465820312494,42.04113400940807]]]}}]}}' \
  --compressed
```
- HOSTNAME: API hostname.
- TOKEN: Bearer token
- GROUP: Group/organization to assign the content.

Note: `ApiKey` authorization can be used instead of the Bearer token via `-H 'apiKey: <APIKEY>`

#### Uploading content via local script

Required format
- same as above, but in JSONL format (see: http://jsonlines.org)
```
$ cat example.jsonl | ./support/bootstrap-fixture-data.ts --apiKey <APIKEY> --organization <GROUP>
```
