// Copyright 2021 The Casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Current role can not view the target resource.
 */
export class PermissionInsufficientError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

/**
 * There is no rule or directive for current endpoint.
 */
export class RuleNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

/**
 * Enforcer was not provided in the context with the CasbinContextEnforcerKey.
 */
export class EnforcerNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
