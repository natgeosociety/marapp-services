## Bootstrapping groups, roles & permissions.

This aims to create groups, roles & permissions using Auth0's Authorization Extension.

#### Prerequisite

Requires a Machine to Machine (M2M) application to be configured in Auth0.
More details about Auth0 Authorization Extension API and using the extension can be found [here](https://auth0.com/docs/api/authorization-extension).

#### Creating groups, roles & permissions, assigning the owner.

```bash
./support/bootstrap-groups-roles-permissions.ts --createGroup <ORGANIZATION> --ownerEmail <EMAIL>
```
- ORGANIZATION: Organization short name, needs to be globally unique.
- EMAIL: Email address of an already registered user.

`Note` Any additional requests can be handled by the admin using a JSON Web Token (JWT) obtained by the admin.
