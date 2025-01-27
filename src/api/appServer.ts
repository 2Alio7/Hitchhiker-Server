import { ApolloServer } from "@apollo/server";
import { createServer } from "http";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import bodyParser from "body-parser";
import express from "express";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { PubSub } from "graphql-subscriptions";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolver.js";

/**
 * Starts the server and initializes the necessary components.
 * @returns {Promise<void>} A promise that resolves when the server has started.
 */
export async function startServer() {
  const port = 4000;
  const pubSub = new PubSub();
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const app = express();
  const httpServer = createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/",
  });

  const wsServerCleanup = useServer({ schema }, wsServer);

  const apolloServer = new ApolloServer({
    schema,
  });

  await apolloServer.start();

  app.use("/", bodyParser.json(), expressMiddleware(apolloServer));

  httpServer.listen(port, () => {
    console.log(`🚀 Query endpoint ready at http://localhost:${port}/`);
    console.log(`🚀 Subscription endpoint ready at ws://localhost:${port}/`);
  });
}
