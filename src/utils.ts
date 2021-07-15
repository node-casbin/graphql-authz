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

import { GraphQLResolveInfo } from 'graphql';
import { Enforcer } from 'casbin';

export const CasbinContextPathCacheKey = '_casbinPathCache';
export const CasbinContextEnforcerKey = '_casbinEnforcer';
export const CasbinContextRoleKey = '_casbinRole';
export const CasbinAuthTypeName = 'CasbinCanVisit';

/**
 * Get the full path of current endpoint by GraphQLResolveInfo.
 * @param info GraphQLResolveInfo
 */
export const Info2Path = (info: GraphQLResolveInfo): string => {
  let node = info.path;
  let fullPath = node.key.toString();
  while (node.prev) {
    node = node.prev;
    if (typeof node.key !== 'number') {
      fullPath = node.key.toString() + '.' + fullPath;
    }
  }
  return fullPath;
};

/**
 * Create key with endpoint path and action.
 * @param path
 * @param action
 */
export const PathAndAction2Key = (path: string, action: string): string => {
  return `${path}_${action}`;
};

/**
 * use policies to build path cache. This can get additional performance optimize.
 * @param CasbinInstance
 */
export const buildPathCache = async (CasbinInstance: Enforcer): Promise<Array<string>> => {
  const CasbinGraphQLCache: Array<string> = [];
  const policies = await CasbinInstance.getPolicy();
  for (const policy of policies) {
    const key = PathAndAction2Key(policy[1], policy[2]);
    if (!CasbinGraphQLCache.includes(key)) {
      CasbinGraphQLCache.push(key);
    }
  }
  return CasbinGraphQLCache;
};
