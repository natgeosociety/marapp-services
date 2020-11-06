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

/**
 * This option allows the use of a custom global setup module which exports an async
 * function that is triggered once before all test suites.
 * This function gets Jest's globalConfig object as a parameter.
 *
 * Note: Any global variables that are defined through globalSetup can only be read in
 * globalTeardown. You cannot retrieve globals defined here in your test suites.
 * @param globalConfig
 */
export default async (globalConfig) => {
  if (globalConfig.silent) {
    process.env.LOG_LEVEL = null; // disable logging in tests;
  }
};
