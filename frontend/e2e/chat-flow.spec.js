import { test, expect } from '@playwright/test';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8080'; // Backend (Docker: 8080)
const APP_URL = process.env.APP_URL || 'http://localhost:3000'; // Frontend (Docker: 3000, Dev: 5173)

test.describe('Resonant E2E Tests', () => {
  
  // --- Test Data Seeding Helper ---
  // We use this to populate the DB before specific tests
  // avoiding the need to manually click through creation steps every time.
  async function seedChatEnvironment(request) {
    const timestamp = Date.now();
    const user = {
      username: `e2e_user_${timestamp}`,
      email: `e2e_${timestamp}@example.com`,
      password: 'Password123!'
    };

    // 1. Register User via API
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: user });
    expect(regResponse.ok()).toBeTruthy();
    const { token, userId } = await regResponse.json();

    // 2. Create Server via API
    const serverData = { name: `E2E Server ${timestamp}`, description: 'Test Server' };
    const serverResponse = await request.post(`${API_URL}/api/servers`, {
      headers: { Authorization: `Bearer ${token}` },
      data: serverData
    });
    expect(serverResponse.ok()).toBeTruthy();
    const server = await serverResponse.json();

    // 3. Create Channel via API
    const channelData = { name: 'general', description: 'General Chat' };
    const channelResponse = await request.post(`${API_URL}/api/servers/${server.id}/channels`, {
      headers: { Authorization: `Bearer ${token}` },
      data: channelData
    });
    expect(channelResponse.ok()).toBeTruthy();
    const channel = await channelResponse.json();

    // 4. Create a Historical Message via API
    const messageData = { content: `Historical message from ${timestamp}` };
    const msgResponse = await request.post(`${API_URL}/api/channels/${channel.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      data: messageData
    });
    expect(msgResponse.ok()).toBeTruthy();

    return { user, server, channel, messageData };
  }

  // --- Tests ---

  test('User can register a new account', async ({ page }) => {
    const timestamp = Date.now();
    const newUser = {
      username: `new_user_${timestamp}`,
      email: `new_${timestamp}@example.com`,
      password: 'Password123!'
    };

    await page.goto(`${APP_URL}/auth`); // Adjust path to your registration page
    
    // Fill Registration Form (adjust selectors to match your Auth component)
    // Page defaults to "Welcome back" (Login), so switch to Register
    await page.getByRole('button', { name: 'Register' }).click();
    
    // Wait for the Email field to appear to confirm state switch
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();

    await page.getByRole('textbox', { name: 'Username' }).fill(newUser.username);
    await page.getByRole('textbox', { name: 'Email' }).fill(newUser.email);
    await page.getByLabel('Password').fill(newUser.password);
    await page.getByRole('button', { name: 'Register' }).click();

    // Expect successful redirection or dashboard element
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Select a server first')).toBeVisible(); 
  });

  test('User can login, find server/channel, see history, and send message', async ({ page, request }) => {
    // 1. Populate Database
    const { user, server, channel, messageData } = await seedChatEnvironment(request);

    // 2. Login via UI
    await page.goto(`${APP_URL}/auth`);
    await page.getByRole('textbox', { name: 'Username' }).fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Login' }).click();

    // 3. Check Server Existence
    // Verify the seeded server appears in the sidebar/list
    // UI displays server initial
    await expect(page.getByRole('button', { name: server.name.charAt(0), exact: true })).toBeVisible();
    
    // Click the server
    await page.getByRole('button', { name: server.name.charAt(0), exact: true }).click();

    // 4. Check Channel Existence
    // Verify channel appears (assuming sidebar logic)
    await expect(page.getByText(channel.name)).toBeVisible();
    
    // Click the channel
    await page.getByText(channel.name).click();

    // 5. Check Header & Previous Messages
    // Based on MessageThread.jsx: <h2>... ${serverName} > #${channelName}</h2>
    await expect(page.locator('h2')).toContainText(`${server.name} > #${channel.name}`);
    // Verify the historical message exists
    await expect(page.getByText(messageData.content)).toBeVisible();

    // 6. Send a New Message
    const newMessageContent = `Live browser message ${Date.now()}`;
    await page.getByPlaceholder('Type a message...').fill(newMessageContent);
    await page.getByRole('button', { name: 'Send' }).click();

    // Verify the new message appears immediately
    await expect(page.getByText(newMessageContent)).toBeVisible();
  });

  test('User can discover and join a server', async ({ page, request }) => {
    // 1. Setup: Create User A and Server A (The target)
    const { server: targetServer } = await seedChatEnvironment(request);

    // 2. Setup: Create User B (The joiner)
    const timestamp = Date.now();
    const userB = {
      username: `joiner_${timestamp}`,
      email: `joiner_${timestamp}@example.com`,
      password: 'Password123!'
    };
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: userB });
    expect(regResponse.ok()).toBeTruthy();

    // 3. Login as User B
    await page.goto(`${APP_URL}/auth`);
    await page.getByRole('textbox', { name: 'Username' }).fill(userB.username);
    await page.getByLabel('Password').fill(userB.password);
    await page.getByRole('button', { name: 'Login' }).click();

    // 4. Open Discovery
    await page.getByTitle('Explore Servers').click();

    // 5. Verify Server A is listed
    // The original selector was too generic. This one scopes the search to a specific row inside the discovery list.
    // Using exact text match for the name and .first() ensures robust selection.
    const serverRow = page.locator('.server-discovery-list > div').filter({ has: page.getByText(targetServer.name, { exact: true }) }).first();
    const joinButton = serverRow.getByRole('button', { name: 'Join' });
    await expect(joinButton).toBeVisible();

    // 6. Join Server A
    await joinButton.click();

    // 7. Verify navigation and sidebar update
    await expect(page).toHaveURL(new RegExp(`/dashboard/${targetServer.id}`));
    await expect(page.getByTitle(targetServer.name)).toBeVisible();

    // 8. Open Discovery again and verify Server A is gone
    await page.getByTitle('Explore Servers').click();
    await expect(serverRow).not.toBeVisible();
  });

  test('User can leave a joined server', async ({ page, request }) => {
    // 1. Setup: Create User A and Server A (target)
    const { server: targetServer } = await seedChatEnvironment(request);

    // 2. Setup: Create User B
    const timestamp = Date.now();
    const userB = {
      username: `leaver_${timestamp}`,
      email: `leaver_${timestamp}@example.com`,
      password: 'Password123!'
    };
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: userB });
    const { token: userBToken } = await regResponse.json();

    // 3. User B joins Server A via API (to speed up test)
    const joinResponse = await request.post(`${API_URL}/api/servers/${targetServer.id}/join`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    expect(joinResponse.ok()).toBeTruthy();

    // 4. Login as User B
    await page.goto(`${APP_URL}/auth`);
    await page.getByRole('textbox', { name: 'Username' }).fill(userB.username);
    await page.getByLabel('Password').fill(userB.password);
    await page.getByRole('button', { name: 'Login' }).click();

    // 5. Select the server and verify name is shown
    await page.getByRole('button', { name: targetServer.name.charAt(0), exact: true }).click();
    // Use specific class to avoid ambiguity with header text
    await expect(page.locator('.active-server-name')).toHaveText(targetServer.name);

    // 6. Leave the server (Handle confirm dialog)
    page.on('dialog', dialog => dialog.accept());
    await page.locator('.leave-server-btn').click();

    // 7. Verify Server is gone from list
    await expect(page.getByRole('button', { name: targetServer.name.charAt(0), exact: true })).not.toBeVisible();
  });
});