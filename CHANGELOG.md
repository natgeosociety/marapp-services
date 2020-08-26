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
