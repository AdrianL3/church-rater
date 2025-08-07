const { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Your Cognito User Pool ID from aws-exports.js
const USER_POOL_ID = 'us-west-1_NNGeSDxTP';
const REGION = 'us-west-1';

const client = new CognitoIdentityProviderClient({ region: REGION });

async function deleteAllUsers() {
  try {
    console.log('Fetching all users...');
    
    // List all users
    const listUsersCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const response = await client.send(listUsersCommand);
    const users = response.Users || [];
    
    console.log(`Found ${users.length} users to delete`);
    
    if (users.length === 0) {
      console.log('No users to delete');
      return;
    }
    
    // Delete each user
    for (const user of users) {
      try {
        const deleteCommand = new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.Username
        });
        
        await client.send(deleteCommand);
        console.log(`Deleted user: ${user.Username}`);
      } catch (error) {
        console.error(`Failed to delete user ${user.Username}:`, error.message);
      }
    }
    
    console.log('All users deleted successfully!');
  } catch (error) {
    console.error('Error deleting users:', error);
  }
}

// Run the script
deleteAllUsers(); 