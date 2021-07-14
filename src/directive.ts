import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import {
  defaultFieldResolver,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLField,
  GraphQLNonNull,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import {
  buildPathCache,
  CasbinAuthTypeName,
  CasbinContextEnforcerKey,
  CasbinContextPathCacheKey,
  CasbinContextRoleKey,
  Info2Path,
  PathAndAction2Key,
} from './utils';
import { EnforcerNotFoundError, PermissionInsufficientError } from './error';
import { Enforcer } from 'casbin';

/**
 * Apply directive to paticular field.
 */
export class CanDirective extends SchemaDirectiveVisitor {
  /**
   * internal function, be called to get directive info.
   * You should also implicit define directive in the GraphQL SDL after graphql-js 14.0.0
   * @param directiveName
   * @param schema
   */
  static getDirectiveDeclaration(directiveName: string, schema: GraphQLSchema): GraphQLDirective | null | undefined {
    return new GraphQLDirective({
      name: 'can',
      locations: [DirectiveLocation.FIELD_DEFINITION], // TODO: Add Support for DirectiveLocation.OBJECT
      args: {
        who: {
          type: GraphQLString,
          defaultValue: '*',
        },
      },
    });
  }

  /**
   * internal function, be called to visit fields.
   * @param field
   */
  public visitFieldDefinition(field: GraphQLField<any, any>): GraphQLField<any, any> | void | null {
    const { resolve = defaultFieldResolver } = field;
    const { who } = this.args;

    if (field.type instanceof GraphQLNonNull && field.type.ofType instanceof GraphQLScalarType) {
      field.type = new GraphQLNonNull(new CanVisitType(field.type.ofType));
    } else if (field.type instanceof GraphQLScalarType) {
      field.type = new CanVisitType(field.type);
    } else {
      throw new Error(`Not a scalar type: ${field.type}`);
    }

    field.resolve = async function (source: any, args: { [p: string]: any }, context: any, info: GraphQLResolveInfo) {
      const action = info.operation.operation;
      const path = Info2Path(info);
      let role = context[CasbinContextRoleKey];

      if (!(CasbinContextEnforcerKey in context)) {
        throw new EnforcerNotFoundError(`You must provide Enforcer in the context with key ${CasbinContextEnforcerKey}`);
      }
      const CasbinInstance = context[CasbinContextEnforcerKey] as Enforcer;
      if (!(CasbinContextPathCacheKey in context)) {
        context[CasbinContextPathCacheKey] = await buildPathCache(CasbinInstance);
      }
      const pathCache = context[CasbinContextPathCacheKey] as Array<string>;
      if (!pathCache.includes(path)) {
        await CasbinInstance.addPolicy(who, path, action);
        pathCache.push(PathAndAction2Key(path, action));
      }
      const passed = await CasbinInstance.enforce(role, path, action);
      if (passed) {
        return await resolve.apply(this, [source, args, context, info]);
      } else {
        if (role === '*') {
          role = 'anonymous';
        }
        throw new PermissionInsufficientError(`${role} can not ${action} ${path}`);
      }
    };
  }

  // This function will allow @can be applied to GraphQLObject
  // TODO: implement public visitObject(object: GraphQLObjectType): GraphQLObjectType | void | null {}
}

/**
 * Override GraphQLScalarType, used to judge if current node have directive.
 */
export class CanVisitType extends GraphQLScalarType {
  constructor(type: GraphQLScalarType) {
    super({
      name: CasbinAuthTypeName,
      serialize(value: any) {
        return type.serialize(value);
      },
      parseLiteral(value: any, maybe?: any) {
        return type.parseLiteral(value, maybe);
      },
      parseValue(value) {
        return type.parseValue(value);
      },
    });
  }
}
