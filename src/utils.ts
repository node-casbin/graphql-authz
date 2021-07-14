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
