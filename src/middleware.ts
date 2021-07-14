import { Enforcer } from 'casbin';
import { IMiddleware } from 'graphql-middleware';
import { buildPathCache, CasbinAuthTypeName, CasbinContextPathCacheKey, CasbinContextRoleKey, Info2Path, PathAndAction2Key } from './utils';
import { PermissionInsufficientError, RuleNotFoundError } from './error';
import { GraphQLNonNull, GraphQLResolveInfo, GraphQLScalarType } from 'graphql';

/**
 * node-casbin instance and the key of graphql context to get `role`.
 */
export class MiddlewareOptions {
  enforcer: Enforcer;
  ctxMember = 'role';
}

/**
 * newMiddleware return a middleware for graphql-middleware
 * @param options node-casbin instance and the key of graphql context to get `role`.
 */
export const newMiddleware = async (options: MiddlewareOptions): Promise<IMiddleware<any, any, any>> => {
  const CasbinInstance = options.enforcer;

  return async (resolve, root, args, context, info: GraphQLResolveInfo) => {
    let role = context[options.ctxMember] ? context[options.ctxMember] : '*';
    const path = Info2Path(info);
    const action = info.operation.operation;

    if (!(CasbinContextRoleKey in context)) {
      context[CasbinContextRoleKey] = role;
    }

    if (!(CasbinContextPathCacheKey in context)) {
      context[CasbinContextPathCacheKey] = await buildPathCache(CasbinInstance);
    }

    const pathCache = context[CasbinContextPathCacheKey];
    const key = PathAndAction2Key(path, action);

    // Try to find if exist directive.
    // Will skip path check to execute directive query.
    const returnType = info.returnType;

    if (!pathCache.includes(key)) {
      if (
        (returnType instanceof GraphQLScalarType && returnType.name === CasbinAuthTypeName) ||
        (returnType instanceof GraphQLNonNull &&
          returnType.ofType instanceof GraphQLScalarType &&
          returnType.ofType.name === CasbinAuthTypeName)
      ) {
        // wait for directive
        return await resolve(root, args, context, info);
      } else {
        throw new RuleNotFoundError(`Can not find rule for ${action} ${path}`);
      }
    }

    const passed = await CasbinInstance.enforce(role, path, action);
    if (passed) {
      return await resolve(root, args, context, info);
    } else {
      if (role === '*') {
        role = 'anonymous';
      }
      throw new PermissionInsufficientError(`${role} can not ${action} ${path}`);
    }
  };
};
