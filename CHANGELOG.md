## [1.14.1](https://github.com/natgeosociety/marapp-services/compare/v1.14.0...v1.14.1) (2021-01-28)


### Bug Fixes

* change cloudfront header behavior [EP-3660] ([f569899](https://github.com/natgeosociety/marapp-services/commit/f56989914ceec49b21b175dc88c05ca7cc6f76b5))
* missing group field for GET /metrics/slugs [EP-3677] ([9c7d3d7](https://github.com/natgeosociety/marapp-services/commit/9c7d3d7813de2ff139faf15197ecccf8a5548f76))
* update countries, sort by label [EP-3682] ([9789922](https://github.com/natgeosociety/marapp-services/commit/9789922b67579d842c8272b66d23ba0f29ad9b6c))

# [1.14.0](https://github.com/natgeosociety/marapp-services/compare/v1.13.0...v1.14.0) (2021-01-12)


### Features

* manage tile cache on config change ([1e72350](https://github.com/natgeosociety/marapp-services/commit/1e72350db9d2370f300ebc2372e66cda75baed3c))

# [1.13.0](https://github.com/natgeosociety/marapp-services/compare/v1.12.0...v1.13.0) (2021-01-07)


### Bug Fixes

* Fix undefined name on legacy users [EP-3466] ([3b7bcf4](https://github.com/natgeosociety/marapp-services/commit/3b7bcf47fc98677c421e420080f4f1d7856d2636))
* grant S3 bucket access ([6ed4934](https://github.com/natgeosociety/marapp-services/commit/6ed49347359187b90c1f2cd514b3f79931e78f0d))
* increase max token size to 100 [EP-2973] ([7b03a68](https://github.com/natgeosociety/marapp-services/commit/7b03a68528c0faa41d24d667427e7ef132456812))
* revert cache policy changes ([8db4ea5](https://github.com/natgeosociety/marapp-services/commit/8db4ea5cce604f9a3794f58c155fa1e608350615))
* set cache-busting version param as optional ([e1b8cab](https://github.com/natgeosociety/marapp-services/commit/e1b8cabd7ef04fe7f197d8bb54a8017c3532955e))
* supress saslprep warning from mongo ([717c51a](https://github.com/natgeosociety/marapp-services/commit/717c51ac2f180ce713f49a8681db7d84a9fb2e00))
* update cache policy config ([6906412](https://github.com/natgeosociety/marapp-services/commit/69064127012927f9b7a97e3d46dcf70df8c5f8d6))
* update cloudfront cache config with cache policy & request policy ([ecd9d20](https://github.com/natgeosociety/marapp-services/commit/ecd9d20ced6249c81180ab562078cb1468cb3fb1))
* update ref property ([8aadcc5](https://github.com/natgeosociety/marapp-services/commit/8aadcc51d24c861a3ee24d07ce0fb4058fe3c838))
* use origin cache headers for cache behaviour ([d44da10](https://github.com/natgeosociety/marapp-services/commit/d44da10e20c3062752675c1c48eb2240277c86fd))
* use ref short form ([122680b](https://github.com/natgeosociety/marapp-services/commit/122680b2b0c813f74d5a5bab8fac3d92f0019758))
* webpack externals ([a80e055](https://github.com/natgeosociety/marapp-services/commit/a80e055b1ecedec707e47cded1fe96fc98834b93))


### Features

* support cache-busting on layer config changes ([1b6bbde](https://github.com/natgeosociety/marapp-services/commit/1b6bbde94c7762b4f292734a265023f259f4310b))


### Performance Improvements

* webpack bundle optimization ([1228119](https://github.com/natgeosociety/marapp-services/commit/1228119c56309a7a032c3520b5e9ec7158115716))

# [1.12.0](https://github.com/natgeosociety/marapp-services/compare/v1.11.0...v1.12.0) (2020-12-17)


### Bug Fixes

* Change export response to download URL ([4e92f92](https://github.com/natgeosociety/marapp-services/commit/4e92f92d53850420fb7faf484a068c69fd88bb9b))
* filtering on metrics endpoint ([28ab6af](https://github.com/natgeosociety/marapp-services/commit/28ab6af9264f56f359cda1988935d6aec8fc4a05))
* invalidate primary group cache ([7e228c7](https://github.com/natgeosociety/marapp-services/commit/7e228c7a1eeed8d397d3065c51f5c0f88d8e7489))
* leave organization endpoint ([b668b25](https://github.com/natgeosociety/marapp-services/commit/b668b2582fc2949e4aa878c328d9e3c87f753b75))
* metric slugs check for primary group ([6948c25](https://github.com/natgeosociety/marapp-services/commit/6948c25d0a601f692ca45f815a4fb20ba8989841))
* mongoose query wrapper [EP-3452] ([#98](https://github.com/natgeosociety/marapp-services/issues/98)) ([c806bf8](https://github.com/natgeosociety/marapp-services/commit/c806bf8cee73e737c1e2ed805725548d203cee3a))
* redis cache TTL ([b569623](https://github.com/natgeosociety/marapp-services/commit/b56962380706f28dbe8db82f3af26e2b41c567d2))
* set doc._id if specified ([7211782](https://github.com/natgeosociety/marapp-services/commit/7211782f1d542cd4783da8a4d90007872568e99b))
* set ee export resolution ([61cca11](https://github.com/natgeosociety/marapp-services/commit/61cca11751a4db58fe40c69fb666347518637264))
* Sort aggregation filter options [EP-3267] ([928f4e1](https://github.com/natgeosociety/marapp-services/commit/928f4e1f6db10c2c919f2fdf52125054173ef6a2))
* support boolean conditionals ([d95d1bf](https://github.com/natgeosociety/marapp-services/commit/d95d1bfb7e95985444201882ab9ca0cc68de0fb2))
* update package-lock.json ([599288e](https://github.com/natgeosociety/marapp-services/commit/599288eb4f5e42aeb2e60a3955aae2552552e33b))
* validation for version field, support optimistic version control on all models ([688c3ea](https://github.com/natgeosociety/marapp-services/commit/688c3ea7f0fa05fa172a30b7461aa18dfa5c0d6f))


### Features

* allow owner to leave when others are available [EP-3255] ([#90](https://github.com/natgeosociety/marapp-services/issues/90)) ([3bc21ae](https://github.com/natgeosociety/marapp-services/commit/3bc21ae909a6063a29f0690b124ea26c8ee45df8))
* APIs for downloading collections [EP-3002] ([ac3890d](https://github.com/natgeosociety/marapp-services/commit/ac3890d7125beabdc6189aa70cf6c2abe39bdc9d))
* Cache Auth0 Authorization service ([e85a6dd](https://github.com/natgeosociety/marapp-services/commit/e85a6ddda7bd37557817cc8166c749f82a9e3bbd))
* enforce UUIDv4 for client generated IDs ([a8d44ae](https://github.com/natgeosociety/marapp-services/commit/a8d44ae4bf308f57a1d06f6bacea26036ef77e6f))
* handle optimistic concurrency control on update [EP-3175] ([6f534b8](https://github.com/natgeosociety/marapp-services/commit/6f534b85ee729d0d46e73d26dd560efad2a0ae45))
* Raster clipping service [EP-3541] ([80462bc](https://github.com/natgeosociety/marapp-services/commit/80462bc744cc1cc506646b1b8a4cbd95ed07934c))
* support client generated IDs ([af8315c](https://github.com/natgeosociety/marapp-services/commit/af8315c8e503edcfd121bed657cd6d0323fe556b))
* support OAuth2 on Swagger [EP-3615] ([997a889](https://github.com/natgeosociety/marapp-services/commit/997a8895143d2153852c7a5af1f2b1d2917a9e20))


### Reverts

* Revert "fix: mongoose query wrapper [EP-3452] (#98)" (#99) ([cb55d1b](https://github.com/natgeosociety/marapp-services/commit/cb55d1bdd270c843f45e7c7acaecfbc23abcd595)), closes [#98](https://github.com/natgeosociety/marapp-services/issues/98) [#99](https://github.com/natgeosociety/marapp-services/issues/99)

# [1.11.0](https://github.com/natgeosociety/marapp-services/compare/v1.10.2...v1.11.0) (2020-11-25)


### Bug Fixes

* allow storing "empty" data for public resource field ([ccfd1ee](https://github.com/natgeosociety/marapp-services/commit/ccfd1ee901d66aa16a68b12cb1801594e2464ceb))
* filter global public resources for locations [EP-3452] ([e984905](https://github.com/natgeosociety/marapp-services/commit/e98490561e689ab46c9b5371f71fcee5c6041504))
* re-generate slugname on null values ([41367e0](https://github.com/natgeosociety/marapp-services/commit/41367e07879abfb4d75eca9e105fda90087c0697))
* update query condition ([b6b0e71](https://github.com/natgeosociety/marapp-services/commit/b6b0e71fb27f3a5eb8f456aecfe5489edf81b10b))
* update user's name [EP-3434] ([#84](https://github.com/natgeosociety/marapp-services/issues/84)) ([74d19b5](https://github.com/natgeosociety/marapp-services/commit/74d19b56a1cda56d7d3ccf97eba129a7a816899a))


### Features

* allow owner to leave when others are available [EP-3255] ([#90](https://github.com/natgeosociety/marapp-services/issues/90)) ([#93](https://github.com/natgeosociety/marapp-services/issues/93)) ([1c021a7](https://github.com/natgeosociety/marapp-services/commit/1c021a7bc725e3dfda84033e3dfa763b2db8abdd))
* consolidate collection & location types [EP-3400] ([e7ee570](https://github.com/natgeosociety/marapp-services/commit/e7ee570c6c4d435327534a51da2772d74198c365))
* enforce optional fields based on condition ([#83](https://github.com/natgeosociety/marapp-services/issues/83)) ([433aa30](https://github.com/natgeosociety/marapp-services/commit/433aa30f0e9078ddf5b78f3677a90e6324c9bad8))
* support exists operator in query, remove collection types ([4ddb1da](https://github.com/natgeosociety/marapp-services/commit/4ddb1da24f6976c39f5c825d69be7cf1f4f0e3f7))

## [1.10.2](https://github.com/natgeosociety/marapp-services/compare/v1.10.1...v1.10.2) (2020-11-04)


### Bug Fixes

* exclude computed fields on empty collections [EP-3305] ([3afcd63](https://github.com/natgeosociety/marapp-services/commit/3afcd63c096aac7505b7074c6d41f67177420621))
* include public group on workspace delete [EP-3300] ([5441537](https://github.com/natgeosociety/marapp-services/commit/5441537bd1db1ddf4ec8e0a12c88412ad5294b88))

## [1.10.1](https://github.com/natgeosociety/marapp-services/compare/v1.10.0...v1.10.1) (2020-11-03)


### Bug Fixes

* force email verified to false on email change request ([c76b8e8](https://github.com/natgeosociety/marapp-services/commit/c76b8e87ba3062171d2a880d2f163648440b7d2d))
* typo ([99c2cab](https://github.com/natgeosociety/marapp-services/commit/99c2cab08381c2e700635da86457dd2160f4616b))

# [1.10.0](https://github.com/natgeosociety/marapp-services/compare/v1.9.0...v1.10.0) (2020-11-03)


### Bug Fixes

* exclude public role from available groups ([5b92a2e](https://github.com/natgeosociety/marapp-services/commit/5b92a2efe419121b233641817415becec6303607))
* query filters collection & organization ([9085477](https://github.com/natgeosociety/marapp-services/commit/9085477e7d37e0618139acd5d2aaaeeb8e798cb2))
* remove publicResource filter condition ([30239a5](https://github.com/natgeosociety/marapp-services/commit/30239a5034ca4bdb6d6e23f3d6bbaa408f2d118e))


### Features

* add support for public role, refactor membership-service ([be73b23](https://github.com/natgeosociety/marapp-services/commit/be73b23cad9531ad1029d9f7ef447d356c0aa910))
* auto-generate slug if missing [EP-3263] ([7616564](https://github.com/natgeosociety/marapp-services/commit/7616564d8cb4d444db8e7335cdcb48f0070a23cb))
* org create/edit owner emails feedback [EP-3125] ([#74](https://github.com/natgeosociety/marapp-services/issues/74)) ([d2f815b](https://github.com/natgeosociety/marapp-services/commit/d2f815b2efc5f14ef4aed93e063e191e92fa059d))
* public locations on collection [EP-3172] ([a1054d6](https://github.com/natgeosociety/marapp-services/commit/a1054d654a6e28cdda0497270ce655cf8065776d))
* support include and select query options on PUT/POST ([dccefd4](https://github.com/natgeosociety/marapp-services/commit/dccefd4099e0302e8d8d65fde3b81bb32affb72e))
* validate document references [EP-3250] ([993ee1c](https://github.com/natgeosociety/marapp-services/commit/993ee1cf679602efa7f31ab8e42a8fe74d220876))

# [1.9.0](https://github.com/natgeosociety/marapp-services/compare/v1.8.0...v1.9.0) (2020-10-27)


### Bug Fixes

* change S3 put lifecycle configuration endpoint ([546acd7](https://github.com/natgeosociety/marapp-services/commit/546acd75dc3cb617d4f84fd4b1fd6d604212b32e))


### Features

* **profile:** resend email validation [EP-3231] ([5177b9d](https://github.com/natgeosociety/marapp-services/commit/5177b9d605abfd22e766ae3903c612c0aef2ff03))

# [1.8.0](https://github.com/natgeosociety/marapp-services/compare/v1.7.0...v1.8.0) (2020-10-22)


### Bug Fixes

* add bucket PutBucketPolicy IAM role ([f5df154](https://github.com/natgeosociety/marapp-services/commit/f5df154f02485fc77924e760da5365d86e53f7a6))
* request with async handler and promise ([c0a63f6](https://github.com/natgeosociety/marapp-services/commit/c0a63f6f433682d469517182a2a82f5383cca62a))
* return callback parameter ([d3ad40d](https://github.com/natgeosociety/marapp-services/commit/d3ad40d054edb05b045afdd2d3e8a8563b42eeee))
* serverless IAM roles ([02a6d5e](https://github.com/natgeosociety/marapp-services/commit/02a6d5e459cfa390ef25b0b6e7f2a16b8f92f8b4))
* service name typo ([92cd962](https://github.com/natgeosociety/marapp-services/commit/92cd962cfeff0b5316d996875472f2231e28b05f))
* set IAM publish action for wipe-data topic ([32c4adb](https://github.com/natgeosociety/marapp-services/commit/32c4adb8e7ee4e612a85fd5f4b59c113aa7efc26))
* typo ([5bef8bb](https://github.com/natgeosociety/marapp-services/commit/5bef8bb47d9a853d97f346d5fb254ba4a5ac6bea))
* update loglevel ([4280f4d](https://github.com/natgeosociety/marapp-services/commit/4280f4d63245e561bbd2129923335b5a8625333d))
* workspace delete group ID ([0a2983b](https://github.com/natgeosociety/marapp-services/commit/0a2983b37de97ea7e43e5a35a60c31f7bdeecbc1))
* **profile:** handle super-admin checks [EP-3155] ([12a31c1](https://github.com/natgeosociety/marapp-services/commit/12a31c1d66a11c99c9fa32ed3960e2ec89747b8b))


### Features

* handle complete workspace deletion ([bde3321](https://github.com/natgeosociety/marapp-services/commit/bde33215e15042715e9b603ac89d9d0734c60fab))
* storage map-tiles deletion on layer delete ([45a81cd](https://github.com/natgeosociety/marapp-services/commit/45a81cd7d938910fdf0e4bc2b72d66e99915f399))

# [1.7.0](https://github.com/natgeosociety/marapp-services/compare/v1.6.0...v1.7.0) (2020-10-19)


### Bug Fixes

* delete account special cases ([#64](https://github.com/natgeosociety/marapp-services/issues/64)) ([9f1df32](https://github.com/natgeosociety/marapp-services/commit/9f1df32379eaaf6e191252463cd536de71b15565))
* force email verified to true ([47df21f](https://github.com/natgeosociety/marapp-services/commit/47df21fd826c49014f3ad2ff7db1b96eb4f238fb))
* primary groups based on membership ([0f7d3b7](https://github.com/natgeosociety/marapp-services/commit/0f7d3b7560c0f017b01569d61c95323a44f2903e))
* user profile orgs remove only from available nested groups ([20f93a7](https://github.com/natgeosociety/marapp-services/commit/20f93a7d80abaf81d4d516baea5f4ce073c4b736))


### Features

* delete user profile [EP-2924] ([#63](https://github.com/natgeosociety/marapp-services/issues/63)) ([43286e5](https://github.com/natgeosociety/marapp-services/commit/43286e573f29f8617f21b0f9a52ca77ecf447c65))
* enforce lowercase for slug when creating org [EP-2755] ([fe95f1b](https://github.com/natgeosociety/marapp-services/commit/fe95f1b30e7afc110f20af048280ed1bbbb6b4ad))
* remove continent option from location types [EP-2767] ([9dba09a](https://github.com/natgeosociety/marapp-services/commit/9dba09adf1918d08fbadaf82e92c8d1e6329911b))
* user profile remove orgs [EP-2620] ([#61](https://github.com/natgeosociety/marapp-services/issues/61)) ([5553707](https://github.com/natgeosociety/marapp-services/commit/555370767a048e004fee5456860d90d8dfdbb2cd))

# [1.6.0](https://github.com/natgeosociety/marapp-services/compare/v1.5.0...v1.6.0) (2020-10-08)


### Bug Fixes

* Add standalone bulk response serializer ([12d3b6e](https://github.com/natgeosociety/marapp-services/commit/12d3b6eabbb8d1da4bbb9e9d7d1556434114e218))
* admin/owner destruct order ([b4a4e91](https://github.com/natgeosociety/marapp-services/commit/b4a4e91732740a662880631db18d13d6c6c55740))
* cleanup empty values ([6e0745c](https://github.com/natgeosociety/marapp-services/commit/6e0745c107665c4c74617212888af08557a6d4df))
* cleanup organization resources [EP-2599] ([f6e6cfc](https://github.com/natgeosociety/marapp-services/commit/f6e6cfc40c4635640912b046891d5e5df8b3e601))
* Enforce layer id when generating tiles ([be4c109](https://github.com/natgeosociety/marapp-services/commit/be4c109d1fb7474afb0f87dd47dab26edf78ddd6))
* next cursor condition [EP-2487] ([1f848cb](https://github.com/natgeosociety/marapp-services/commit/1f848cb2c1e5fbbf933ce0164bcd9ef11669b49e))
* skip update of users that already have a role [EP-3024] ([10ad445](https://github.com/natgeosociety/marapp-services/commit/10ad44537363011e01d9d485309b3eb117b033d8))
* Tile router typo for Y coordinate ([b51d577](https://github.com/natgeosociety/marapp-services/commit/b51d577803889193994553c17281672e88cd6c63))
* update response status code ([1da3e83](https://github.com/natgeosociety/marapp-services/commit/1da3e83f3aa7faed959732c16a5bf0fd67e6b1b2))
* **pagination:** Handle next cursor when page is empty [EP-2487] ([0771321](https://github.com/natgeosociety/marapp-services/commit/0771321159cab7819c631fe6e658aba93fdecbce))
* **search:** Add lowercase filter to search analyzer [EP-2752] ([24f62c4](https://github.com/natgeosociety/marapp-services/commit/24f62c42d96f18990d369085f7a79b9451b37c17))
* **search:** Case insensitive sorting, sort numeric substrings based on their numeric value [EP-1127] ([3fb51be](https://github.com/natgeosociety/marapp-services/commit/3fb51be0e94c12c445060e0e572c2129a6ac10db))
* **search:** Include digits in search analyzer [EP-2752] ([20b45e4](https://github.com/natgeosociety/marapp-services/commit/20b45e46762db1a5903fee9dfbd7b1b510360085))


### Features

* input validation & sanitization [EP-3004] ([53f2469](https://github.com/natgeosociety/marapp-services/commit/53f2469d0e90079734d180a9a2acf81cec46de38))


### Performance Improvements

* optimize users update [EP-2216] ([e63f970](https://github.com/natgeosociety/marapp-services/commit/e63f9705680bc1087f2a0ecc220f5b53b5dbb571))
* update redirect type for tile requests ([eddb5f1](https://github.com/natgeosociety/marapp-services/commit/eddb5f1252e4352d7b12e1330b639fab690c4409))

# [1.5.0](https://github.com/natgeosociety/marapp-services/compare/v1.4.0...v1.5.0) (2020-09-24)


### Bug Fixes

* Handle dynamic enum options on widgets [EP-2916] ([0a2f49d](https://github.com/natgeosociety/marapp-services/commit/0a2f49d07d82c655bf61605a8f0faf36406b4445))


### Features

* add multiple users to an org [EP-2216] ([6e61023](https://github.com/natgeosociety/marapp-services/commit/6e610239e7e1619784bafbccc4b618f1ca6a1e98))

# [1.4.0](https://github.com/natgeosociety/marapp-services/compare/v1.3.0...v1.4.0) (2020-09-22)


### Features

* **invite:** handle user invitation ([9794e12](https://github.com/natgeosociety/marapp-services/commit/9794e121ee6a96eefd0bbc50de703961a34469d9))
* add admin filter options to API response [EP-2889] ([24dc95f](https://github.com/natgeosociety/marapp-services/commit/24dc95f9e78c8d4606d989b2f71f34b93e38a10a))
* replace password change with password change request via email ([48d52d4](https://github.com/natgeosociety/marapp-services/commit/48d52d4db8b3bd304c3befa069a3f8e46c0e2d74))

# [1.3.0](https://github.com/natgeosociety/marapp-services/compare/v1.2.0...v1.3.0) (2020-09-14)


### Features

* include membership groups on user-profile ([56e1460](https://github.com/natgeosociety/marapp-services/commit/56e14601abc0fd5e2bf6fbd1008064bd68831152))
* reduce lambda bundle by using babel-loader ([5a9d745](https://github.com/natgeosociety/marapp-services/commit/5a9d745b0c888d87fc6f6b1155bf50a108bcef5b))

# [1.2.0](https://github.com/natgeosociety/marapp-services/compare/v1.1.1...v1.2.0) (2020-09-10)


### Bug Fixes

* change name conflict in swagger ([efb7e10](https://github.com/natgeosociety/marapp-services/commit/efb7e10b61be383a5336847826f751c91d51505b))
* change separator for SuperAdmin role ([13cc155](https://github.com/natgeosociety/marapp-services/commit/13cc1559205d8e0b51b36d1d2c11569a8a0b4eef))
* condition for already registered emails ([a2edf34](https://github.com/natgeosociety/marapp-services/commit/a2edf34814b78b5996f810fa71d8781d6f5f7104))
* disable fork-ts-checker-webpack-plugin on webpack build ([0d33b89](https://github.com/natgeosociety/marapp-services/commit/0d33b897daf58b8407f66e776479c5c02c9c9d68))
* handle email validation ([a51c69a](https://github.com/natgeosociety/marapp-services/commit/a51c69ab2af7e4f571bc824791ffa8ad8627a140))
* handle empty add/remove user operation ([1235d44](https://github.com/natgeosociety/marapp-services/commit/1235d44a7598652607513ce84b467dcb69bbab7b))
* handle optional parameters on organization PUT request ([e3c35b5](https://github.com/natgeosociety/marapp-services/commit/e3c35b5db76157c0cd2f5c9a25aef38b594f77a3))
* omit of special fields (organization) on filter ([d376078](https://github.com/natgeosociety/marapp-services/commit/d376078839a2a39d7c9c8d78f503bb1a9c6f9555))
* optional parameter validation on organization PUT request ([b9d9ef4](https://github.com/natgeosociety/marapp-services/commit/b9d9ef4e06ba9724e168a16c989f8e225e5b784a))
* org stats count published only ([32f626a](https://github.com/natgeosociety/marapp-services/commit/32f626a406f17b0a8937f005f35def0382afe346))
* org stats query (layers) ([d488bcf](https://github.com/natgeosociety/marapp-services/commit/d488bcf2bfd658e5c26ee0a54425dd428ef25372))
* replace email validation logic ([3b74e54](https://github.com/natgeosociety/marapp-services/commit/3b74e540f6bd75c81718be62af3ec5a72920c8dd))


### Features

* **profile:** support for profile-management [EP-2508] ([e418018](https://github.com/natgeosociety/marapp-services/commit/e4180180289cb10afc339e3fcc58ed6131703fe0))
* add support for filtering layers by organization [EP-2125] ([48ce266](https://github.com/natgeosociety/marapp-services/commit/48ce266ccede2c3a62e639804b287e5660beae32))
* add support for filtering locations by organization [EP-2125] ([56f5410](https://github.com/natgeosociety/marapp-services/commit/56f541098d620819f667c6b9470f71cb45876365))
* change organization data fields, enforce org URL friendly slug ([a314f46](https://github.com/natgeosociety/marapp-services/commit/a314f46ca1b9fdf6a99000ba4ed8fdb51db603f0))
* org stats (locations / layers) [EP-2087] ([e1b098c](https://github.com/natgeosociety/marapp-services/commit/e1b098cd3de31965c062181eee30b00614a449de))


### Reverts

* support for filtering locations & layers by organization [EP-2125] ([0fec992](https://github.com/natgeosociety/marapp-services/commit/0fec992f6fd1d2c9ddb8b8a808322a8aa5371d2e))

## [1.1.1](https://github.com/natgeosociety/marapp-services/compare/v1.1.0...v1.1.1) (2020-08-28)


### Bug Fixes

* forbid update/delete on own user [EP-2363] ([f595da5](https://github.com/natgeosociety/marapp-services/commit/f595da5c0a9f8611d931a06a42bf943b314eb48a))
* handle no owner error ([936387b](https://github.com/natgeosociety/marapp-services/commit/936387b8376d405f852308684cdb37e532059d4c))

# [1.1.0](https://github.com/natgeosociety/marapp-services/compare/v1.0.2...v1.1.0) (2020-08-26)


### Bug Fixes

* limit page number to 10 for users ([9b5ee8e](https://github.com/natgeosociety/marapp-services/commit/9b5ee8e2a597b2f5c32595e160c5eddfc53bc239))


### Features

* make owners as optional include on organization list ([38ca5bb](https://github.com/natgeosociety/marapp-services/commit/38ca5bb92ff51113fc08fd0d44f68bbb8342cf3a))

## [1.0.2](https://github.com/natgeosociety/marapp-services/compare/v1.0.1...v1.0.2) (2020-08-26)


### Bug Fixes

* create organization typo in membership-service ([eaaef9b](https://github.com/natgeosociety/marapp-services/commit/eaaef9b7d83568ceb4b605bcf44f841ce02387cf))

## [1.0.1](https://github.com/natgeosociety/marapp-services/compare/v1.0.0...v1.0.1) (2020-08-26)


### Bug Fixes

* add duplicate key error message for update operation ([0c5d5be](https://github.com/natgeosociety/marapp-services/commit/0c5d5be8efd7a511a494cf7345fe3f8704e46c47))

# 1.0.0 (2020-08-26)


### Bug Fixes

* add JSON:API slug serializer ([067ec7f](https://github.com/natgeosociety/marapp-services/commit/067ec7fa9d69d7941701a920024da1bd7567f886))
* call counts async ([523e434](https://github.com/natgeosociety/marapp-services/commit/523e434c480c142746ef4f772534159cfe26592a))
* change group separator ([531f6cf](https://github.com/natgeosociety/marapp-services/commit/531f6cf071094bad81d6464e9704088d0c7ee831))
* change value separator to pipe ([c0d4795](https://github.com/natgeosociety/marapp-services/commit/c0d4795f4b91977983e79b0876b83d77053eae3f))
* change value separator to semicolon ([6d78aca](https://github.com/natgeosociety/marapp-services/commit/6d78aca2b25d14bbd8bf8507ff7df8955eea948d))
* deny update of other admin / owner ([d900b74](https://github.com/natgeosociety/marapp-services/commit/d900b748ae371d15bfc697925ffbdf9db80cd1ae))
* empty search ([78dce1d](https://github.com/natgeosociety/marapp-services/commit/78dce1d00139d1c8f8915132d2f28fee4db553be))
* empty search result ([2e5619c](https://github.com/natgeosociety/marapp-services/commit/2e5619c39ed346c7d90180617a31f240f58dfb41))
* EP-2360 check for admin/owner on delete ([dc2e9e8](https://github.com/natgeosociety/marapp-services/commit/dc2e9e8e6b076e198f3033b4e8b0ac6b3db60806))
* handle error while creating missing role ([4f6be7d](https://github.com/natgeosociety/marapp-services/commit/4f6be7d2fde7d5284a41c4daf175e5c5e0ebde17))
* keep only filter values separated by pipe ([d498b19](https://github.com/natgeosociety/marapp-services/commit/d498b191031847737da21f617196bc03bcfea9b8))
* set default to require authentication ([4b681d5](https://github.com/natgeosociety/marapp-services/commit/4b681d58ccfc2bc2afc495faf5a8d43adaef3400))
* unwind aggregate counts for array types (layer category) [EP-2391] ([26091f2](https://github.com/natgeosociety/marapp-services/commit/26091f2f62d3bcf0978e28b008062f1fc00ef706))
* update lint ([5202aa1](https://github.com/natgeosociety/marapp-services/commit/5202aa13b37432d15519b934b37d8b42b94654ff))
* use options enum on aggregate count [EP-2482] ([dcf85b8](https://github.com/natgeosociety/marapp-services/commit/dcf85b817b0ec10afd7522ae7d3150a2146f4644))


### Features

* [EP-1804] public org support ([23c5dfb](https://github.com/natgeosociety/marapp-services/commit/23c5dfb66b193cc4ee8e4491558b5702a793726c))
* [EP-1878] org owners update ([9456c72](https://github.com/natgeosociety/marapp-services/commit/9456c7223c3eb0fdd6a3006bf56bf240231ee773))
* [EP-1881] add API for organization list ([4652d73](https://github.com/natgeosociety/marapp-services/commit/4652d734c8525618875385e7eedab0a5299bde7c))
* [EP-1882] add API for organization edit ([78ad612](https://github.com/natgeosociety/marapp-services/commit/78ad612fd64b85ad610d0cecfa217a7ab47f8153))
* [EP-1906] owner support ([a4acf87](https://github.com/natgeosociety/marapp-services/commit/a4acf87b6420b13e8d6dd4a20a2097b1a5a41055))
* [EP-1908] add API for organization details ([99157a7](https://github.com/natgeosociety/marapp-services/commit/99157a73a9b8177372cc54564f6f14259410dbfd))
* [EP-2095] add '$searchHint' on get location ([245dcc6](https://github.com/natgeosociety/marapp-services/commit/245dcc6c62f418b3c1cb38841401df8f1a30819a))
* [EP-2364] upsert groups configuration (nested groups / permissions / roles) ([5eab7db](https://github.com/natgeosociety/marapp-services/commit/5eab7dbc27873e24a8411330d91a9fb136d7aad4))
* [story/EP-1790] new org API ([eeab051](https://github.com/natgeosociety/marapp-services/commit/eeab0510b5b5ffdf582a289d43ab2ffe8f62a180))
* add $searchHint on search endpoints ([6d33651](https://github.com/natgeosociety/marapp-services/commit/6d3365190fb2c27525c1a2b75ca20ea55a0dff4b))
* add extra logging for search ([be5272a](https://github.com/natgeosociety/marapp-services/commit/be5272acd2e828f29c5d02500865dcf283b68926))
* Add primary property on layer object [EP-2392] ([329750f](https://github.com/natgeosociety/marapp-services/commit/329750f51ba444b658594ad979a29f5678f44f40))
* check env for public org ([2b7290c](https://github.com/natgeosociety/marapp-services/commit/2b7290c2cfdd780445af44b40316c08199a0b341))
* create unique slug endpoint for resources [EP-2533] ([6dcd6e7](https://github.com/natgeosociety/marapp-services/commit/6dcd6e78d99c55876c5ccdacca84f5cfd4d12c47))
* include $searchHint on searializers ([4df17d8](https://github.com/natgeosociety/marapp-services/commit/4df17d847b98a0dbba03373957b6dc837cbdc346))
* move anonymous access at handler level ([6b72c4a](https://github.com/natgeosociety/marapp-services/commit/6b72c4a750d7a12b09ab5e4fa3a2cf47fcbef10b))
* Remove enforce primary group for orgs, remove org property from swagger ([d207275](https://github.com/natgeosociety/marapp-services/commit/d207275c8f99796582c5c8717a3f043d6870cff4))
* remove organization support [EP-2371] ([02b6b2f](https://github.com/natgeosociety/marapp-services/commit/02b6b2ff2f0000e9941209fe1802cc079d3e4d21))
* set owner on bootstrap ([0a9723f](https://github.com/natgeosociety/marapp-services/commit/0a9723f10c16569ef828b7e5e5d934cbd04da173))
* super-admin / org roles ([3f2c4db](https://github.com/natgeosociety/marapp-services/commit/3f2c4dbfaff926f70833b9a8c22f87cc15075234))
* support organization stats endpoint [EP-2548] ([28f2312](https://github.com/natgeosociety/marapp-services/commit/28f2312be00de75efbdd64d2575a04cb3285e5d4))
* update docs ([a8b0b81](https://github.com/natgeosociety/marapp-services/commit/a8b0b81a4c21f0112029131f0bbbbca80e56cbcd))

## [1.0.1](https://github.com/natgeosociety/marapp-services/compare/v1.0.0...v1.0.1) (2020-08-26)


### Bug Fixes

* handle error while creating missing role ([4f6be7d](https://github.com/natgeosociety/marapp-services/commit/4f6be7d2fde7d5284a41c4daf175e5c5e0ebde17))

# 1.0.0-develop.1 (2020-08-26)


### Bug Fixes

* add JSON:API slug serializer ([067ec7f](https://github.com/natgeosociety/marapp-services/commit/067ec7fa9d69d7941701a920024da1bd7567f886))
* call counts async ([523e434](https://github.com/natgeosociety/marapp-services/commit/523e434c480c142746ef4f772534159cfe26592a))
* change group separator ([531f6cf](https://github.com/natgeosociety/marapp-services/commit/531f6cf071094bad81d6464e9704088d0c7ee831))
* change value separator to pipe ([c0d4795](https://github.com/natgeosociety/marapp-services/commit/c0d4795f4b91977983e79b0876b83d77053eae3f))
* change value separator to semicolon ([6d78aca](https://github.com/natgeosociety/marapp-services/commit/6d78aca2b25d14bbd8bf8507ff7df8955eea948d))
* deny update of other admin / owner ([d900b74](https://github.com/natgeosociety/marapp-services/commit/d900b748ae371d15bfc697925ffbdf9db80cd1ae))
* empty search ([78dce1d](https://github.com/natgeosociety/marapp-services/commit/78dce1d00139d1c8f8915132d2f28fee4db553be))
* empty search result ([2e5619c](https://github.com/natgeosociety/marapp-services/commit/2e5619c39ed346c7d90180617a31f240f58dfb41))
* EP-2360 check for admin/owner on delete ([dc2e9e8](https://github.com/natgeosociety/marapp-services/commit/dc2e9e8e6b076e198f3033b4e8b0ac6b3db60806))
* handle error while creating missing role ([4f6be7d](https://github.com/natgeosociety/marapp-services/commit/4f6be7d2fde7d5284a41c4daf175e5c5e0ebde17))
* keep only filter values separated by pipe ([d498b19](https://github.com/natgeosociety/marapp-services/commit/d498b191031847737da21f617196bc03bcfea9b8))
* set default to require authentication ([4b681d5](https://github.com/natgeosociety/marapp-services/commit/4b681d58ccfc2bc2afc495faf5a8d43adaef3400))
* unwind aggregate counts for array types (layer category) [EP-2391] ([26091f2](https://github.com/natgeosociety/marapp-services/commit/26091f2f62d3bcf0978e28b008062f1fc00ef706))
* update lint ([5202aa1](https://github.com/natgeosociety/marapp-services/commit/5202aa13b37432d15519b934b37d8b42b94654ff))
* use options enum on aggregate count [EP-2482] ([dcf85b8](https://github.com/natgeosociety/marapp-services/commit/dcf85b817b0ec10afd7522ae7d3150a2146f4644))


### Features

* [EP-1804] public org support ([23c5dfb](https://github.com/natgeosociety/marapp-services/commit/23c5dfb66b193cc4ee8e4491558b5702a793726c))
* [EP-1878] org owners update ([9456c72](https://github.com/natgeosociety/marapp-services/commit/9456c7223c3eb0fdd6a3006bf56bf240231ee773))
* [EP-1881] add API for organization list ([4652d73](https://github.com/natgeosociety/marapp-services/commit/4652d734c8525618875385e7eedab0a5299bde7c))
* [EP-1882] add API for organization edit ([78ad612](https://github.com/natgeosociety/marapp-services/commit/78ad612fd64b85ad610d0cecfa217a7ab47f8153))
* [EP-1906] owner support ([a4acf87](https://github.com/natgeosociety/marapp-services/commit/a4acf87b6420b13e8d6dd4a20a2097b1a5a41055))
* [EP-1908] add API for organization details ([99157a7](https://github.com/natgeosociety/marapp-services/commit/99157a73a9b8177372cc54564f6f14259410dbfd))
* [EP-2095] add '$searchHint' on get location ([245dcc6](https://github.com/natgeosociety/marapp-services/commit/245dcc6c62f418b3c1cb38841401df8f1a30819a))
* [EP-2364] upsert groups configuration (nested groups / permissions / roles) ([5eab7db](https://github.com/natgeosociety/marapp-services/commit/5eab7dbc27873e24a8411330d91a9fb136d7aad4))
* [story/EP-1790] new org API ([eeab051](https://github.com/natgeosociety/marapp-services/commit/eeab0510b5b5ffdf582a289d43ab2ffe8f62a180))
* add $searchHint on search endpoints ([6d33651](https://github.com/natgeosociety/marapp-services/commit/6d3365190fb2c27525c1a2b75ca20ea55a0dff4b))
* add extra logging for search ([be5272a](https://github.com/natgeosociety/marapp-services/commit/be5272acd2e828f29c5d02500865dcf283b68926))
* Add primary property on layer object [EP-2392] ([329750f](https://github.com/natgeosociety/marapp-services/commit/329750f51ba444b658594ad979a29f5678f44f40))
* check env for public org ([2b7290c](https://github.com/natgeosociety/marapp-services/commit/2b7290c2cfdd780445af44b40316c08199a0b341))
* create unique slug endpoint for resources [EP-2533] ([6dcd6e7](https://github.com/natgeosociety/marapp-services/commit/6dcd6e78d99c55876c5ccdacca84f5cfd4d12c47))
* include $searchHint on searializers ([4df17d8](https://github.com/natgeosociety/marapp-services/commit/4df17d847b98a0dbba03373957b6dc837cbdc346))
* move anonymous access at handler level ([6b72c4a](https://github.com/natgeosociety/marapp-services/commit/6b72c4a750d7a12b09ab5e4fa3a2cf47fcbef10b))
* Remove enforce primary group for orgs, remove org property from swagger ([d207275](https://github.com/natgeosociety/marapp-services/commit/d207275c8f99796582c5c8717a3f043d6870cff4))
* remove organization support [EP-2371] ([02b6b2f](https://github.com/natgeosociety/marapp-services/commit/02b6b2ff2f0000e9941209fe1802cc079d3e4d21))
* set owner on bootstrap ([0a9723f](https://github.com/natgeosociety/marapp-services/commit/0a9723f10c16569ef828b7e5e5d934cbd04da173))
* super-admin / org roles ([3f2c4db](https://github.com/natgeosociety/marapp-services/commit/3f2c4dbfaff926f70833b9a8c22f87cc15075234))
* support organization stats endpoint [EP-2548] ([28f2312](https://github.com/natgeosociety/marapp-services/commit/28f2312be00de75efbdd64d2575a04cb3285e5d4))
* update docs ([a8b0b81](https://github.com/natgeosociety/marapp-services/commit/a8b0b81a4c21f0112029131f0bbbbca80e56cbcd))
