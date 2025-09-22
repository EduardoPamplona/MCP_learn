# Gmail MCP Server Setup Guide

This guide will help you set up the Gmail MCP server to access your Gmail account programmatically through the MCP Learning Assistant.

## Prerequisites

- Google account with Gmail
- Google Cloud Console access
- Node.js and npm installed

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

## Step 2: Enable Gmail API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click on Gmail API and click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: External (for personal use) or Internal (for organization use)
   - App name: "MCP Gmail Assistant" (or your preferred name)
   - User support email: Your email
   - Authorized domains: (leave empty for testing)
   - Scopes: Add the following scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
4. Back in Credentials, create OAuth client ID:
   - Application type: **Desktop application**
   - Name: "Gmail MCP Client"
5. Download the JSON file with your credentials

## Step 4: Set Up MCP Gmail Server

1. Extract the `client_id` and `client_secret` from your downloaded JSON file
2. Run the setup authentication command through the MCP assistant:

```bash
# Start the assistant
npm run agent

# In the chat interface, use the setup command:
"Set up Gmail authentication with client ID your_client_id and client secret your_client_secret"
```

3. The assistant will provide you with an authorization URL
4. Open the URL in your browser
5. Sign in to your Google account and grant permissions
6. Copy the authorization code provided
7. Set the environment variable:

```bash
export GMAIL_AUTH_CODE="your_authorization_code_here"
```

8. Restart the Gmail server or assistant to complete authentication

## Step 5: Test Gmail Integration

Once set up, you can use the following commands:

### List Emails
```
"Show me my latest emails"
"List unread emails"
"Check my inbox"
```

### Send Emails
```
"Send an email to john@example.com about the meeting tomorrow"
"Compose an email to team@company.com subject Project Update with message Hello team, here's our progress update."
```

### Delete Emails
```
"Delete email with ID abc123"
```

## Available Gmail Tools

### 1. listEmails
Lists emails from your Gmail account with optional filtering.

**Parameters:**
- `maxResults` (optional): Number of emails to return (default: 10, max: 100)
- `query` (optional): Gmail search query (e.g., "is:unread", "from:example@gmail.com")
- `labelIds` (optional): Array of label IDs to filter by

**Examples:**
- List latest emails: `{maxResults: 10}`
- List unread emails: `{query: "is:unread"}`
- List emails from specific sender: `{query: "from:boss@company.com"}`

### 2. sendEmail
Sends an email via your Gmail account.

**Parameters:**
- `to`: Array of recipient email addresses (required)
- `subject`: Email subject line (required)
- `body`: Email body content (required)
- `cc` (optional): Array of CC recipients
- `bcc` (optional): Array of BCC recipients

**Example:**
```json
{
  "to": ["john@example.com", "jane@example.com"],
  "subject": "Meeting Tomorrow",
  "body": "Hi team,\n\nReminder about our meeting tomorrow at 2 PM.\n\nBest regards",
  "cc": ["manager@company.com"]
}
```

### 3. deleteEmail
Deletes an email by its message ID.

**Parameters:**
- `messageId`: Gmail message ID (required)

**Example:**
```json
{
  "messageId": "1234567890abcdef"
}
```

### 4. setupGmailAuth
Initial setup for Gmail OAuth authentication.

**Parameters:**
- `clientId`: Google OAuth 2.0 client ID (required)
- `clientSecret`: Google OAuth 2.0 client secret (required)

## Security Notes

1. **Credentials Storage**: OAuth credentials are stored locally in the `data/` directory
2. **Token Management**: Access tokens are automatically refreshed as needed
3. **Scope Limitations**: The server only requests necessary Gmail permissions
4. **Local Access**: All authentication data remains on your local machine

## Troubleshooting

### Authentication Errors

If you see authentication errors:

1. Check that your OAuth credentials are correct
2. Ensure the Gmail API is enabled in your Google Cloud project
3. Verify that your authorization code hasn't expired (they expire after 10 minutes)
4. Re-run the setup process if needed

### Permission Errors

If you get permission denied errors:

1. Check that your OAuth consent screen is properly configured
2. Ensure you've granted all necessary permissions during authorization
3. Verify that your Google account has access to Gmail

### API Quota Errors

Gmail API has usage quotas:

1. Check your API usage in Google Cloud Console
2. Standard quotas are usually sufficient for personal use
3. Consider implementing rate limiting for high-volume usage

## Example Usage

Here's a complete example of using the Gmail MCP server:

```javascript
// Through the MCP Learning Assistant
"Show me my unread emails"
// Returns: List of unread emails with subjects, senders, and previews

"Send an email to colleague@work.com about tomorrow's presentation"
// Assistant will extract the email and subject, ask for clarification if needed

"Delete the email with ID 1a2b3c4d5e6f7g8h"
// Confirms deletion and shows email details
```

## Advanced Configuration

### Environment Variables

You can set the following environment variables:

- `GMAIL_AUTH_CODE`: Authorization code from OAuth flow
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account credentials (for server-to-server)

### Custom Scopes

The server uses these Gmail API scopes:
- `https://www.googleapis.com/auth/gmail.readonly`: Read emails
- `https://www.googleapis.com/auth/gmail.send`: Send emails  
- `https://www.googleapis.com/auth/gmail.modify`: Delete/modify emails

### Rate Limiting

Gmail API has rate limits:
- 1 billion quota units per day
- 250 quota units per user per second
- Different operations consume different quota units

The MCP server includes built-in error handling for quota exceeded scenarios.

## Support

For issues with the Gmail MCP server:

1. Check the console output for error messages
2. Verify your Google Cloud Console setup
3. Ensure all required scopes are granted
4. Check that the Gmail API is enabled and has sufficient quota

For Google API issues, refer to the [Gmail API documentation](https://developers.google.com/gmail/api).