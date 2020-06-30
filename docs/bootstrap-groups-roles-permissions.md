## Bootstrapping groups, roles & permissions.

This aims to create groups, roles & permissions using Auth0's Authorization Extension.

#### Prerequisite

Requires a Machine to Machine (M2M) application to be configured in Auth0.
More details about Auth0 Authorization Extension API and using the extension can be found [here](https://auth0.com/docs/api/authorization-extension).

#### Creating groups, roles & permissions.

```bash
./scripts/bootstrap-groups-roles-permissions.ts --clientId <AUTH0_M2M_CLIENT_ID> --clientSecret <AUTH0_M2M_CLIENT_SECRET> --applicationId <AUTH0_CLIENT_ID> --createGroup <ORG_NAME>
```
- AUTH0_M2M_CLIENT_ID: Auth0 Machine to Machine (M2M) client ID.
- AUTH0_M2M_CLIENT_SECRET: Auth0 Machine to Machine (M2M) client secret.
- AUTH0_CLIENT_ID: Auth0 Application used for authentication.
- ORG_NAME: Organization short name, needs to be globally unique.

#### Assigning a first admin to an organization. 

You first need to retrieve all the available groups.
```bash
./scripts/bootstrap-groups-roles-permissions.ts --clientId <AUTH0_M2M_CLIENT_ID> --clientSecret <AUTH0_M2M_CLIENT_SECRET> --applicationId <AUTH0_CLIENT_ID> --getAllGroups
```

From the array of returned groups, you will need to pick the UUID of the Admin group created in the previous step.

Use the provided Admin group UUID together with the email address to add the initial user.
```bash
./scripts/bootstrap-groups-roles-permissions.ts --clientId <AUTH0_M2M_CLIENT_ID> --clientSecret <AUTH0_M2M_CLIENT_SECRET> --applicationId <AUTH0_CLIENT_ID> --groupId <GROUP_ID> --userEmail <EMAIL>>
```
- GROUP_ID: UUID of the organization group.
- EMAIL: Email address of an already registered user.

`Note` Any additional requests can be handled by the admin using a JSON Web Token (JWT) obtained by the admin.
