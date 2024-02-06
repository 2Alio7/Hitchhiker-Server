import { startServer } from "./api/appServer.js";
import { db } from "./db/DbHelper.js";
import { User } from "./entities/User.js";

async function main() {
  await db();
  console.log();
  console.log();
  await startServer();
  console.log();
  console.log();
  const users: User[] = [new User(), new User()];
  users.forEach((user) => {
    console.log(user);
  });
}

main();
