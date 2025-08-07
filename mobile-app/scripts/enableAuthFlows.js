const { CognitoIdentityProviderClient, UpdateUserPoolClientCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Your Cognito User Pool and Client IDs from aws-exports.js
const USER_POOL_ID = 'us-west-1_NNGeSDxTP';
const CLIENT_ID = '35eiafke5u59ldmupuo8j0j522';
const REGION = 'us-west-1';

const client = new CognitoIdentityProviderClient({ region: REGION });

async function enableAuthFlows() {
  try {
    console.log('Enabling authentication flows...');
    
    const command = new UpdateUserPoolClientCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      ExplicitAuthFlows: [
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
    });
    
    const response = await client.send(command);
    console.log('Authentication flows enabled successfully!');
    console.log('Updated client:', response.UserPoolClient);
  } catch (error) {
    console.error('Error enabling auth flows:', error);
  }
}

// Run the script
enableAuthFlows(); 