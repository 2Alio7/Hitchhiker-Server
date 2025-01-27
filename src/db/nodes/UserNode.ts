import { dbDriver } from "../dbConnection.js";
import { User, titles } from "../../entities/User.js";

export class UserNode {
  public async AddUser(user: User): Promise<User> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
        CREATE (user:User {
          username: $username,
          profilePic: $profilePic,
          email: $email,
          password: $password,
          Name: $name,
          birthDate: $birthDate,
          homeLocation: $homeLocation,
          sex: $sex,
          Bio: $bio,
          followingCntr: 0,
          followersCntr: 0,
          postCntr: 0,
          reviewsCntr: 0,
          score: 0,
          totalUpvotes: 0,
          totalDownvotes: 0
        })
        RETURN user
        `,
        {
          username: user.username,
          profilePic: user.profilePic,
          email: user.email,
          password: user.password, // Ensure this is the hashed password
          name: user.Name,
          birthDate: user.birthDate,
          homeLocation: user.homeLocation,
          sex: user.sex,
          bio: user.Bio,
          followingCntr: user.followingCntr,
          followersCntr: user.followersCntr,
          postCntr: user.postCntr,
          reviewsCntr: user.reviewsCntr,
        }
      );

      console.log(`User creation result: ${result}`);
      return user;
    } catch (err) {
      console.error(`Error adding user: ${err}`);
      throw err;
    }
  }
  public async FindUserByUsername(username: string): Promise<User | null> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
        MATCH (user:User {username: $username})
        RETURN user
        `,
        { username }
      );

      console.log(result.records.length);

      if (result.records.length > 0) {
        const user = result.records[0]?.get("user").properties;
        return {
          id: user.id,
          email: user.email,
          password: user.password,
          username: user.username,
          profilePic: user.profilePic,
          Name: user.Name,
          birthDate: user.birthDate,
          homeLocation: user.homeLocation,
          sex: user.sex,
          Bio: user.Bio,
          followingCntr: user.followingCntr,
          followersCntr: user.followersCntr,
          postCntr: user.postCntr,
          reviewsCntr: user.reviewsCntr,
        };
      }

      return null;
    } catch (err) {
      console.error(`Error finding user by email: ${err}`);
      throw err;
    }
  }
  public async UpdateUser(username: string, profilePic: string): Promise<void> {
    try {
      const driver = dbDriver;
      console.log(username);
      console.log(profilePic);
      const result = await driver.executeQuery(
        `
        MATCH (user:User {username: $username})
        SET user.profilePic = $profilePic
        `,
        {
          username: username,
          profilePic: profilePic,
        }
      );
    } catch (err) {
      console.error(`Error updating user: ${err}`);
      throw err;
    }
  }
  public async DeleteUser(username: string): Promise<void> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
        MATCH (user:User {username: $username})
        DETACH DELETE user
        `,
        {
          username: username,
        }
      );
    } catch (err) {
      console.error(`Error deleting user: ${err}`);
      throw err;
    }
  }
  public async FetchUserProfile(
    profileUsername: string,
    currentUsername: string
  ): Promise<User> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
        MATCH (user:User {username: $profileUsername})
        OPTIONAL MATCH (user)-[exp:HAS_EXPERIENCE_AT]->(category:Category)
        OPTIONAL MATCH (:User{username: $currentUsername})-[follow:FOLLOWS]->(user)
        RETURN user,
               collect({title: category.name, score: exp.score}) AS ranks,
               CASE WHEN follow IS NOT NULL THEN true ELSE false END AS isFollowed

        `,
        { profileUsername, currentUsername }
      );

      let userProfile: User = {} as User;

      result.records.forEach((record) => {
        const userData = record.get("user").properties;
        userProfile = {
          username: userData.username,
          profilePic: userData.profilePic,
          Name: userData.Name,
          Bio: userData.Bio,
          followingCntr: parseFloat(userData.followingCntr),
          followersCntr: parseFloat(userData.followersCntr),
          postCntr: parseFloat(userData.postCntr),
          reviewsCntr: parseFloat(userData.reviewsCntr),
          score: parseFloat(userData.score),
          titles: this.processScores(
            record.get("ranks"),
            parseFloat(userData.score)
          ),
          totalUpvotes: parseFloat(userData.totalUpvotes),
          totalDownvotes: parseFloat(userData.totalDownvotes),
          isFollowed: record.get("isFollowed"),
        };
      });
      return userProfile;
    } catch (err) {
      console.error(`Error fetching user profile: ${err}`);
      throw err;
    }
  }
  public modifyTitle(category: string, score: number): string {
    if (category === "Origin") {
      return ""; // Return an empty string or any other way to indicate exclusion
    }

    if (score > 0 && score < 500) return category + " Beginner ";
    else if (score >= 500 && score < 1000) return category + " Lover";
    else if (score >= 1000 && score < 2000) return category + " Enthusiast";
    else if (score >= 2000 && score < 4000) return category + " Critic";
    else if (score >= 4000) return category + " Master";
    else if (score == 0) return category + " Newbie";
    else return category + " Hater";
  }
  public processScores(scores: any[], score: number): titles[] {
    let ranks: titles[] = [];
    ranks.push({ title: "Hitches", score: score });
    if (scores[0].title) {
      scores = scores
        .map((score) => ({
          title: this.modifyTitle(score.title, score.score),
          score: parseFloat(score.score),
        }))
        .filter((score) => score.title !== "")
        .sort((a, b) => b.score - a.score);

      ranks.push(...scores);
    }
    return ranks;
  }

  public async FollowUser(
    username: string,
    userToFollow: string
  ): Promise<void> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
        MATCH (follower:User {username: $username}),
              (following:User {username: $userToFollow})
      
        CREATE (follower)-[:FOLLOWS]->(following)
        SET follower.followingCntr = follower.followingCntr + 1
        SET following.followersCntr = following.followersCntr +1 
        `,
        { username, userToFollow }
      );
    } catch (err) {
      console.error(`Error following user: ${err}`);
      throw err;
    }
  }
  public async getFollowingList(
    username: string
  ): Promise<{ username: string; profilePic: string }[]> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
            MATCH (user:User {username: $username})-[:FOLLOWS]->(following:User)
            RETURN following.username AS username, following.profilePic AS profilePic
            `,
        { username }
      );

      return result.records.map((record) => ({
        username: record.get("username"),
        profilePic: record.get("profilePic"),
      }));
    } catch (err) {
      console.error(`Error fetching following list: ${err}`);
      throw err;
    }
  }

  public async getFollowersList(
    username: string
  ): Promise<{ username: string; profilePic: string }[]> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
          MATCH (user:User {username: $username})<-[:FOLLOWS]-(follower:User)
          RETURN follower.username AS username, follower.profilePic AS profilePic
          `,
        { username }
      );

      return result.records.map((record) => ({
        username: record.get("username"),
        profilePic: record.get("profilePic"),
      }));
    } catch (err) {
      console.error(`Error fetching followers list: ${err}`);
      throw err;
    }
  }
  public async UnfollowUser(
    username: string,
    userToUnfollow: string
  ): Promise<void> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
      MATCH (follower:User {username: $username})-[follows:FOLLOWS]->(following:User {username: $userToUnfollow})
      SET follower.followingCntr = follower.followingCntr - 1
      SET following.followersCntr = following.followersCntr - 1 
      DELETE follows
      `,
        { username, userToUnfollow }
      );
    } catch (err) {
      console.error(`Error unfollowing user: ${err}`);
      throw err;
    }
  }

  public async getUsersLikedPost(
    postId: string
  ): Promise<{ username: string; profilePic: string }[]> {
    try {
      const driver = dbDriver;
      const result = await driver.executeQuery(
        `
            MATCH (post:Post {id: $postId})<-[:LIKES_POST]-(user:User)
            RETURN user.username AS username, user.profilePic AS profilePic
            `,
        { postId }
      );

      return result.records.map((record) => ({
        username: record.get("username"),
        profilePic: record.get("profilePic"),
      }));
    } catch (err) {
      console.error(`Error fetching users who liked post: ${err}`);
      throw err;
    }
  }

  public async SearchUser(user: string): Promise<User[]> {
    try {
      const result = await dbDriver.executeQuery(
        `
            MATCH (user:User)
            WHERE toLower(user.username) CONTAINS toLower($user)
            RETURN user
            `,
        { user: user }
      );
      return result.records.map(
        (record) => record.get("user").properties as User
      );
    } catch (err) {
      console.error(`Error searching for users: ${err}`);
      throw err;
    }
  }
  public async leaderBoard(): Promise<User[]> {
    try {
      const result = await dbDriver.executeQuery(
        `
          MATCH (user:User)
          RETURN user.username AS username
                ,user.score AS score
                ,user.profilePic AS profilePic
          ORDER  BY user.score DESC
          LIMIT 10
        `,
        {}
      );

      // Mapping the result records to User objects
      return result.records.map((record) => ({
        username: record.get("username"),
        profilePic: record.get("profilePic"),
        titles: [
          {
            score: parseFloat(record.get("score")),
            title: "Hitches",
          },
        ],
      }));
    } catch (err) {
      console.error(`Error searching for users: ${err}`);
      throw err;
    }
  }
}
