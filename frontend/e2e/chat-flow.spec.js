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
    const random = Math.floor(Math.random() * 10000);
    const user = {
      username: `e2e_user_${timestamp}_${random}`,
      email: `e2e_${timestamp}_${random}@example.com`,
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
    const random = Math.floor(Math.random() * 10000);
    const newUser = {
      username: `new_user_${timestamp}_${random}`,
      email: `new_${timestamp}_${random}@example.com`,
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

    // Inject the API URL for WebSocket connection in Docker environment
    await page.addInitScript(`window.__API_URL__ = '${API_URL}';`);

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

    // 5. Check Previous Messages
    // Verify the historical message exists
    await expect(page.getByText(messageData.content)).toBeVisible();

    // 6. Send a New Message
    const newMessageContent = `Live browser message ${Date.now()}`;
    await page.getByPlaceholder(/Message #/).fill(newMessageContent);
    await page.getByRole('button', { name: 'Send' }).click();

    // Verify the new message appears immediately
    const messageItem = page.locator('.message-item', { hasText: newMessageContent });
    await expect(messageItem).toBeVisible();
    await expect(messageItem.locator('.author-name')).toHaveText(user.username);
  });

  test('User can discover and join a server', async ({ page, request }) => {
    // 1. Setup: Create User A and Server A (The target)
    const { server: targetServer } = await seedChatEnvironment(request);

    // 2. Setup: Create User B (The joiner)
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const userB = {
      username: `joiner_${timestamp}_${random}`,
      email: `joiner_${timestamp}_${random}@example.com`,
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
    const random = Math.floor(Math.random() * 10000);
    const userB = {
      username: `leaver_${timestamp}_${random}`,
      email: `leaver_${timestamp}_${random}@example.com`,
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

    // 6. Leave the server (Handle confirm modal)
    await page.locator('.leave-server-btn').click();
    // Use a specific selector for the modal content to ensure we click the confirm button, not the trigger
    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(`Are you sure you want to leave ${targetServer.name}?`);
    await modal.getByRole('button', { name: 'Leave Server' }).click();

    // 7. Verify Server is gone from list
    await expect(page.getByRole('button', { name: targetServer.name.charAt(0), exact: true })).not.toBeVisible();
  });

  test('Users can exchange messages in real-time (WebSocket)', async ({ browser, request }) => {
    // 1. Setup: User A creates environment (Server & Channel)
    const { user: userA, server, channel } = await seedChatEnvironment(request);

    // 2. Setup: Create User B
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const userB = {
      username: `realtime_${timestamp}_${random}`,
      email: `realtime_${timestamp}_${random}@example.com`,
      password: 'Password123!'
    };
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: userB });
    const { token: tokenB } = await regResponse.json();

    // 3. User B joins Server
    await request.post(`${API_URL}/api/servers/${server.id}/join`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    // 4. Create separate browser contexts for User A and User B
    const contextA = await browser.newContext();
    await contextA.addInitScript(`window.__API_URL__ = '${API_URL}';`);
    const pageA = await contextA.newPage();
    const contextB = await browser.newContext();
    await contextB.addInitScript(`window.__API_URL__ = '${API_URL}';`);
    const pageB = await contextB.newPage();

    // 5. Login User A and go to channel
    await pageA.goto(`${APP_URL}/auth`);
    await pageA.getByRole('textbox', { name: 'Username' }).fill(userA.username);
    await pageA.getByLabel('Password').fill(userA.password);
    await pageA.getByRole('button', { name: 'Login' }).click();
    // Nav
    await pageA.getByRole('button', { name: server.name.charAt(0), exact: true }).click();
    await pageA.getByText(channel.name).click();

    // 6. Login User B and go to same channel
    await pageB.goto(`${APP_URL}/auth`);
    await pageB.getByRole('textbox', { name: 'Username' }).fill(userB.username);
    await pageB.getByLabel('Password').fill(userB.password);
    await pageB.getByRole('button', { name: 'Login' }).click();
    // Nav
    await pageB.getByRole('button', { name: server.name.charAt(0), exact: true }).click();
    await pageB.getByText(channel.name).click();

    // 7. User B sends message
    const msgContent = `Instant message ${Date.now()}`;
    await pageB.getByPlaceholder(/Message #/).fill(msgContent);
    await pageB.getByRole('button', { name: 'Send' }).click();

    // 8. Verify User A sees it immediately 
    // We rely on standard Playwright auto-wait, but since it's WS, it should be fast.
    const messageItem = pageA.locator('.message-item', { hasText: msgContent });
    await expect(messageItem).toBeVisible();
    await expect(messageItem.locator('.author-name')).toHaveText(userB.username);
    
    // Cleanup
    await contextA.close();
    await contextB.close();
  });

  test('User can manage messages (edit, delete, emoji)', async ({ page, request }) => {
    const { user, server, channel } = await seedChatEnvironment(request);

    // 1. Login
    await page.goto(`${APP_URL}/auth`);
    await page.getByRole('textbox', { name: 'Username' }).fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Login' }).click();

    // 2. Navigate to channel
    await page.getByRole('button', { name: server.name.charAt(0), exact: true }).click();
    await page.getByText(channel.name).click();

    // 3. Test Emoji Picker
    await page.locator('.emoji-btn').click();
    await expect(page.locator('.emoji-picker-container')).toBeVisible();
    
    // Click an actual emoji button (using class specific to emoji-picker-react)
    const firstEmoji = page.locator('.emoji-picker-container button.epr-emoji').first();
    await expect(firstEmoji).toBeVisible();
    await firstEmoji.click();
    // Send message with emoji
    await page.getByRole('button', { name: 'Send' }).click();
    // Verify emoji is in the message list (checking for generic emoji presence or specific text if known)
    await expect(page.locator('.message-content').last()).not.toBeEmpty();

    // 4. Test Edit Message
    const initialText = `Edit me ${Date.now()}`;
    await page.getByPlaceholder(/Message #/).fill(initialText);
    await page.getByRole('button', { name: 'Send' }).click();
    // Wait for message to appear to ensure DOM is stable
    await expect(page.getByText(initialText)).toBeVisible();
    
    // Hover/Find the message and click edit (assuming button is visible or appears on hover)
    // For test stability, we might force click or ensure visibility
    const messageItem = page.locator('.message-item', { hasText: initialText });
    await messageItem.hover();
    await messageItem.locator('button[title="Edit"]').click({ force: true });
    await page.locator('.edit-message-form input').fill(initialText + ' - edited');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(initialText + ' - edited')).toBeVisible();

    // 5. Test Delete Message
    page.on('dialog', dialog => dialog.accept()); // Handle browser confirm
    const editedMessageItem = page.locator('.message-item', { hasText: initialText + ' - edited' });
    await editedMessageItem.hover();
    await editedMessageItem.locator('button[title="Delete"]').click({ force: true });
    await expect(page.getByText(initialText + ' - edited')).not.toBeVisible();
  });
});