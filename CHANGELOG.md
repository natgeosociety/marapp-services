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
