import { applyMiddleware } from 'graphql-middleware';
import { newMiddleware } from '../src';
import { newEnforcer } from 'casbin';
import schema from './schema';
import { ApolloServer } from 'apollo-server';
import fetch from 'node-fetch';
import { CanDirective } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { CasbinContextEnforcerKey } from '../src';

const getUser = (token: string): string => {
  if (!token) {
    return '';
  }
  const credentials = token.split(' ')[1];
  const decoded = Buffer.from(credentials, 'base64').toString();
  return decoded.split(':')[0];
};

jest.setTimeout(2000 * 1000);

test('Test Middleware', async () => {
  const enforcer = await newEnforcer('tests/casbin.conf', 'tests/policy.csv');

  const middleware = await newMiddleware({
    ctxMember: 'user',
    enforcer: enforcer,
  });

  const schemaWithMiddleware = applyMiddleware(schema, middleware);

  const server = new ApolloServer({
    schema: schemaWithMiddleware,
    context: ({ req }) => {
      // Get the user token from the headers.
      const token = req.headers.authorization || '';

      // Try to retrieve a user with the token
      const user = getUser(token);

      // Add the user to the context
      return { user };
    },
  });

  const url = await server.listen();
  console.log(`🚀 Server ready at ${url.url}`);

  const response = await fetch('http://localhost:4000/', {
    headers: {
      Authorization: 'Basic dXNlcjpwYXNzd2Q=',
      'Content-Type': 'application/json',
    },
    body: '{"operationName":null,"variables":{},"query":"{\\n  project(id: 2) {\\n    id\\n    name\\n    members {\\n      id\\n      name\\n      tickets {\\n        id\\n        message\\n      }\\n    }\\n  }\\n}\\n"}',
    method: 'POST',
  });
  let responseData = await response.text();

  // works as a trick, remove '\n' at line end
  responseData = responseData.substring(0, responseData.length - 1);

  const expectedResult = {
    errors: [
      {
        message: 'user can not query project.name',
        locations: [{ line: 4, column: 5 }],
        path: ['project', 'name'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 0, 'tickets', 0, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 0, 'tickets', 1, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 0, 'tickets', 2, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 0, 'tickets', 3, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 1, 'tickets', 0, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 1, 'tickets', 1, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 1, 'tickets', 2, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      {
        message: 'user can not query project.members.tickets.message',
        locations: [{ line: 10, column: 9 }],
        path: ['project', 'members', 1, 'tickets', 3, 'message'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
    ],
    data: {
      project: {
        id: 2,
        name: null,
        members: [
          {
            id: 1,
            name: 'Project: 2, Member: 1',
            tickets: [
              { id: '1', message: null },
              { id: '2', message: null },
              {
                id: '3',
                message: null,
              },
              { id: '4', message: null },
            ],
          },
          {
            id: 2,
            name: 'Project: 2, Member: 2',
            tickets: [
              { id: '1', message: null },
              { id: '2', message: null },
              {
                id: '3',
                message: null,
              },
              { id: '4', message: null },
            ],
          },
        ],
      },
    },
  };
  expect(responseData).toEqual(JSON.stringify(expectedResult));
  await server.stop();
});

test('Test Directives', async () => {
  const typeDefs = `
directive @can(who: String!) on FIELD_DEFINITION
type User {
    id: ID! @can(who: "user")
    name: String @can(who: "someone")
}
type Item  {
    id: ID!
    name: String
}
type Query {
    userById(userId: ID!): User 
    itemById(itemId: ID!): Item 
}
`;

  const resolvers = {
    Query: {
      userById(object: any, params: any, ctx: any, resolveInfo: any) {
        console.log('userById resolver');
        console.log(params);
        return {
          id: params.userId,
          name: 'bob',
        };
      },
      itemById(object: any, params: any, ctx: any, resolveInfo: any) {
        console.log('itemById resolver');
        return {
          id: '123',
          name: 'bob',
        };
      },
    },
  };
  const schemaWithDirective = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      can: CanDirective,
    },
  });

  const enforcer = await newEnforcer('tests/casbin.conf', 'tests/policy.csv');

  const middleware = await newMiddleware({
    ctxMember: 'user',
    enforcer: enforcer,
  });

  const schemaWithDirectiveMiddleware = applyMiddleware(schemaWithDirective, middleware);

  const server = new ApolloServer({
    schema: schemaWithDirectiveMiddleware,
    context: ({ req }) => {
      const token = req.headers.authorization || '';

      // Try to retrieve a user with the token
      const user = getUser(token);

      const a: any = {};
      a[CasbinContextEnforcerKey] = enforcer;
      a['user'] = user;
      return a;
    },
  });

  const url = await server.listen({ port: 4001 });
  console.log(`🚀 Server ready at ${url.url}`);
  const response = await fetch('http://localhost:4001/', {
    headers: {
      Authorization: 'Basic dXNlcjpwYXNzd2Q=',
      'Content-Type': 'application/json',
    },
    body: `{"operationName":null,"variables":{},"query":"{\\n  userById(userId: 1) {\\n    name\\n    id\\n  }\\n}\\n"}`,
    method: 'POST',
  });
  let responseData = await response.text();
  // works as a trick, remove '\n' at line end
  responseData = responseData.substring(0, responseData.length - 1);

  const expectedResult = {
    errors: [
      {
        message: 'user can not query userById.name',
        locations: [{ line: 3, column: 5 }],
        path: ['userById', 'name'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
    ],
    data: { userById: { name: null, id: '1' } },
  };
  expect(responseData).toEqual(JSON.stringify(expectedResult));
  await server.stop();
});
