# graphql-authz

graphql-authz is a Casbin authorization middleware for [GraphQL.js](https://github.com/graphql/graphql-js)

[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]
[![install size](https://packagephobia.now.sh/badge?p=graphql-authz)](https://packagephobia.now.sh/result?p=graphql-authz)
[![GitHub Actions](https://github.com/node-casbin/graphql-authz/workflows/main/badge.svg)](https://github.com/node-casbin/graphql-authz/actions)
[![Coverage Status](https://coveralls.io/repos/github/node-casbin/graphql-authz/badge.svg?branch=master)](https://coveralls.io/github/node-casbin/graphql-authz?branch=master)
[![Release](https://img.shields.io/github/release/node-casbin/graphql-authz.svg)](https://github.com/node-casbin/graphql-authz/releases/latest)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/casbin/lobby)

[npm-image]: https://img.shields.io/npm/v/graphql-authz.svg?style=flat-square
[npm-url]: https://npmjs.org/package/graphql-authz
[download-image]: https://img.shields.io/npm/dm/graphql-authz.svg?style=flat-square
[download-url]: https://npmjs.org/package/graphql-authz

## Installation

```shell
npm install graphql-authz
// or
yarn add graphql-authz
```

## Get Started

This package should use with `graphql` and `graphql-middleware`

To limit access to each endpoint, you can use casbin policy or graphql directive.

In the policy method, you can use casbin policy like
```csv
p,user,project.members,query
p,roleb,project.members.tickets.id,query
```
to restricted access to each endpoint.

In the directive method, you can use directive `can` to do the same thing.

Here's a minimal example. You can find the full example in the `tests/server.test.ts`
```typescript
import { applyMiddleware } from 'graphql-middleware';
import { newMiddleware, CanDirective } from 'graphql-authz';
import { newEnforcer } from 'casbin';
import { ApolloServer } from 'apollo-server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { CasbinContextEnforcerKey } from '../src';
// After graphql-js 14.0.0, you should manually define directive in the SDL.
const typeDefs = `
directive @can(who: String!) on FIELD_DEFINITION

type User {
    id: ID! @can(who: "user")
    name: String @can(who: "someone")
}
`;

  const resolvers = {
    // something
  };
  const schemaWithDirective = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      can: CanDirective,
    },
  }); 
  // If you want to use directive, this is necessary.
  // You can ignore this in the policy only method.

  const enforcer = await newEnforcer('tests/casbin.conf', 'tests/policy.csv');
  // As for now, you should use model tests/casbin.conf to initialize enforcer.
  // For more info about enforcer, plz refer to https://github.com/casbin/node-casbin

  const middleware = await newMiddleware({
    ctxMember: 'user', // middleware will get current user role from the graphql context[ctxMember]
    enforcer: enforcer, // Casbin Instance
  });
  
  // Apply middlware to graphql schema
  const schemaWithDirectiveMiddleware = applyMiddleware(schemaWithDirective, middleware);

  const server = new ApolloServer({
    schema: schemaWithDirectiveMiddleware,
    context: ({ req }) => {
      // Provide necessary info in the context.
      const token = req.headers.authorization || '';

      // Try to retrieve a user with the token
      const user = getUser(token);

      const a: any = {};
      a[CasbinContextEnforcerKey] = enforcer;
      a['user'] = user;
      return a;
    },
  });
```

## Getting Help

- [Node-Casbin](https://github.com/casbin/node-casbin)

## License

This project is under Apache 2.0 License. See the [LICENSE](LICENSE) file for the full license text.
