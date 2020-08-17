## Bootstrapping groups, roles & permissions.

This aims to create groups, roles & permissions using Auth0's Authorization Extension.

#### Prerequisite

Requires a Machine to Machine (M2M) application to be configured in Auth0.
More details about Auth0 Authorization Extension API and using the extension can be found [here](https://auth0.com/docs/api/authorization-extension).

#### Creating groups, roles & permissions, assigning the owner.

```bash
./support/bootstrap-groups-roles-permissions.ts --clientId <AUTH0_M2M_CLIENT_ID> --clientSecret <AUTH0_M2M_CLIENT_SECRET> --applicationId <AUTH0_CLIENT_ID> --createGroup <ORG_NAME> --ownerEmail <EMAIL>
```
- AUTH0_M2M_CLIENT_ID: Auth0 Machine to Machine (M2M) client ID.
- AUTH0_M2M_CLIENT_SECRET: Auth0 Machine to Machine (M2M) client secret.
- AUTH0_CLIENT_ID: Auth0 Application used for authentication.
- ORG_NAME: Organization short name, needs to be globally unique.
- EMAIL: Email address of an already registered user.

`Note` Any additional requests can be handled by the admin using a JSON Web Token (JWT) obtained by the admin.
