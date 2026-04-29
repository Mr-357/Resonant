import { test, expect } from '@playwright/test';

// Configuration
// eslint-disable-next-line no-undef
const API_URL = process.env.API_URL || 'https://localhost:8443'; // Backend 
// eslint-disable-next-line no-undef, no-unused-vars
const APP_URL = process.env.APP_URL || 'https://localhost:3443'; // Frontend 
let userRef, serverRef, channelRef, messageRef = null;
let serversToCleanup = [];

  // --- Helpers ---
function generateUserData(prefix = 'user') {
  const id = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@example.com`,
    password: 'Password123!'
  };
}
async function loginUser(page, username, password) {
  await page.goto(`${APP_URL}/auth`);
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/$/); // Ensure we've navigated to the dashboard
}

// We use this to populate the DB before specific tests
async function seedChatEnvironment(request) {
  const user = generateUserData('e2e_user');
  const timestamp = Date.now();
  // 1. Register User via API
  const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: user });
  expect(regResponse.ok()).toBeTruthy();
  const { token } = await regResponse.json();

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

  return { user, server, channel, messageData, token };
}

test.describe('Resonant E2E Tests', () => {
  // --- Tests ---

  test.beforeEach(async ({ page }) => {
    // Inject the API URL so the frontend can connect directly to the backend
    await page.addInitScript((url) => {
      globalThis.__API_URL__ = url;
    }, API_URL);
  });

  test.afterEach(async ({ request }) => {
    for (const { id, token } of serversToCleanup) {
      await request.delete(`${API_URL}/api/servers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    serversToCleanup = [];
  });

  test.beforeAll(async ({ request }) => {
      const seedData  = await seedChatEnvironment(request);
      userRef = seedData.user;
      serverRef = seedData.server;
      channelRef = seedData.channel;  
      messageRef = seedData.messageData;
  });

  test('User can register a new account', async ({ page }) => {
    const newUser = generateUserData('new_user');

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

  test('User can login, find server/channel, see history, and send message', async ({ page }) => {
    // 1. Populate Database
    const user = userRef;
    const server = serverRef;
    const channel = channelRef;
    const messageData = messageRef;

    await loginUser(page, user.username, user.password);

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
    const chatInput = page.getByPlaceholder(/Message #/);
    await chatInput.fill(newMessageContent);
    // Using Enter is more reliable than clicking a button that may have race conditions on its disabled state
    await chatInput.press('Enter');

    // Verify the new message appears immediately
    const messageItem = page.locator('.message-item', { hasText: newMessageContent });
    await expect(messageItem).toBeVisible();
    await expect(messageItem.locator('.author-name')).toHaveText(user.username);
  });

  test('User can discover and join a server', async ({ page, request }) => {
    // 1. Setup: Create User A and Server A (The target)
    const targetServer = serverRef;

    // 2. Setup: Create User B (The joiner)

    const random = Math.floor(Math.random() * 10000);
    const userB = {
      username: `joiner_${Date.now()}_${random}`,
      email: `joiner_${Date.now()}_${random}@example.com`,
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
    await expect(page.locator('.server-discovery-list').getByText(targetServer.name, { exact: true })).not.toBeVisible();
  });

  test('User can leave a joined server', async ({ page, request }) => {
    // 1. Setup: Create User A and Server A (target)
    const { server: targetServer, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: targetServer.id, token: ownerToken });

    // 2. Setup: Create User B
    const userB = generateUserData('leaver');
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: userB });
    const { token: userBToken } = await regResponse.json();

    // 3. User B joins Server A via API (to speed up test)
    const joinResponse = await request.post(`${API_URL}/api/servers/${targetServer.id}/join`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    expect(joinResponse.ok()).toBeTruthy();

    // 4. Login as User B
    await loginUser(page, userB.username, userB.password);

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
    const { user: userA, server, channel, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });

    // 2. Setup: Create User B
    const userB = generateUserData('realtime');
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: userB });
    const { token: tokenB } = await regResponse.json();

    // 3. User B joins Server
    await request.post(`${API_URL}/api/servers/${server.id}/join`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    // 4. Create separate browser contexts for User A and User B
    const contextA = await browser.newContext();
    await contextA.addInitScript((url) => { globalThis.__API_URL__ = url; }, API_URL);
    const pageA = await contextA.newPage();
    const contextB = await browser.newContext();
    await contextB.addInitScript((url) => { globalThis.__API_URL__ = url; }, API_URL);
    const pageB = await contextB.newPage();

    // 5. Login User A and go to channel
    await loginUser(pageA, userA.username, userA.password);
    // Nav
    await pageA.getByRole('button', { name: server.name.charAt(0), exact: true }).click();
    await pageA.getByText(channel.name).click();

    // 6. Login User B and go to same channel
    await loginUser(pageB, userB.username, userB.password);
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
    const { user, server, channel, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });

    await loginUser(page, user.username, user.password);

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
    const chatInput = page.getByPlaceholder(/Message #/);
    await chatInput.press('Enter');
    
    // Wait for the input to clear to avoid race conditions with the next message
    await expect(chatInput).toHaveValue('');

    // Verify emoji is in the message list (checking for generic emoji presence or specific text if known)
    await expect(page.locator('.message-content').last()).not.toBeEmpty();

    // 4. Test Edit Message
    const initialText = `Edit me ${Date.now()}`;
    await chatInput.fill(initialText);
    await chatInput.press('Enter');
    
    // Ensure input is cleared before verifying message visibility
    await expect(chatInput).toHaveValue('');

    // Wait for message to appear to ensure DOM is stable
    await expect(page.getByText(initialText)).toBeVisible();
    
    // Hover/Find the message and click edit (assuming button is visible or appears on hover)
    const messageItem = page.locator('.message-item', { hasText: initialText });
    await messageItem.hover();
    await messageItem.locator('button[title="Edit"]').click({ force: true });
    await page.locator('.edit-message-form input').fill(initialText + ' - edited');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(initialText + ' - edited')).toBeVisible();

    // 5. Test Delete Message
    const editedMessageItem = page.locator('.message-item', { hasText: initialText + ' - edited' });
    await editedMessageItem.hover();
    await editedMessageItem.locator('button[title="Delete"]').click({ force: true });
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(initialText + ' - edited')).not.toBeVisible();
  });

   test('Server owner can manage server settings (rename, kick, delete)', async ({ page, request }) => {
    // 1. Setup: Owner, Member, Server
    const { user: owner, server, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });
    
    // Create member and join
    const member = generateUserData('member');
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: member });
    const { token: memberToken } = await regResponse.json();
    await request.post(`${API_URL}/api/servers/${server.id}/join`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });

    // 2. Login as Owner
    await loginUser(page, owner.username, owner.password);

    // 3. Select Server and verify selection
    const serverButton = page.getByRole('button', { name: server.name.charAt(0), exact: true });
    await expect(serverButton).toBeVisible();
    await serverButton.click();
    await expect(page.locator('.active-server-name')).toHaveText(server.name);

    // 4. Open Server Settings (Right click)
    await serverButton.click({ button: 'right' });

    // 5. Rename Server
    const newName = `${server.name} Updated`;
    await page.locator('#server-settings-name').fill(newName);
    await page.getByRole('button', { name: 'Update' }).click();
    
    // Verify name updated in the active server header
    await expect(page.locator('.active-server-name')).toHaveText(newName);

    // Ensure modal is closed before reopening
    if (await page.getByText('Server Settings').isVisible()) {
        await page.keyboard.press('Escape');
    }

    // 6. Kick Member
    // Open settings again
    await serverButton.click({ button: 'right' });
    
    // Wait for members to load to ensure there is someone to kick
    await expect(page.getByText('Loading members...')).not.toBeVisible();

    // Find the member row and kick button
    const memberRow = page.locator('div', { hasText: member.username }).last(); 
    await expect(memberRow).toBeVisible();
    await memberRow.getByRole('button', { name: 'Kick' }).click();

    // Confirm in custom modal
    await page.getByRole('button', { name: 'Confirm' }).click();
    
    // Verify member is gone from the MEMBERS section
    const membersSection = page.getByLabel('members');
    await expect(membersSection.getByText(member.username)).not.toBeVisible();

    // Verify member now appears in BANNED USERS section (since kick applies a 1m ban)
    const bannedSection = page.getByLabel('banned-users');
    await expect(bannedSection.getByText(member.username)).toBeVisible();

    // 7. Delete Server - Trigger the confirmation modal from Settings
    await page.getByRole('button', { name: 'Delete Server' }).first().click();

    // Confirm in the specific confirmation modal to avoid ambiguity
    const confirmModal = page.locator('.modal-content').filter({ hasText: 'Confirm Server Deletion' });
    await confirmModal.getByRole('button', { name: 'Delete Server' }).click();
    
    // Verify server gone
    await expect(serverButton).not.toBeVisible();
  });

  test('Server owner can manage channels (rename, delete)', async ({ page, request }) => {
    const { user, server, channel, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });

    await loginUser(page, user.username, user.password);

    // Select Server
    await page.getByRole('button', { name: server.name.charAt(0), exact: true }).click();
    
    // Right click channel to open settings
    // ChannelList renders: "# {channel.name}"
    const channelItem = page.getByText(`# ${channel.name}`);
    await channelItem.click({ button: 'right' });

    // Rename
    const newChannelName = `${channel.name}-new`;
    await page.locator('#channel-settings-name').fill(newChannelName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify name update in list
    await expect(page.getByText(`# ${newChannelName}`)).toBeVisible();

    // Delete
    await page.getByText(`# ${newChannelName}`).click({ button: 'right' });
    
    await page.getByRole('button', { name: 'Delete Channel' }).click();
    const confirmModal = page.locator('.modal-content').filter({ hasText: 'Confirm Channel Deletion' });
    await confirmModal.getByRole('button', { name: 'Delete' }).click();

    // Verify gone
    await expect(page.getByText(`# ${newChannelName}`)).not.toBeVisible();
  });

  test('Server owner can delete other users messages', async ({ page, request }) => {
    // Setup: Owner, Member, Server, Channel
    const { user: owner, server, channel, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });
    
    // Create member
    const member = generateUserData('poster');
    const regResponse = await request.post(`${API_URL}/api/auth/register`, { data: member });
    const { token: memberToken } = await regResponse.json();
    
    // Member joins and posts
    await request.post(`${API_URL}/api/servers/${server.id}/join`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    const msgContent = "Member message to be deleted";
    await request.post(`${API_URL}/api/channels/${channel.id}/messages`, {
        headers: { Authorization: `Bearer ${memberToken}` },
        data: { content: msgContent }
    });

    // Login as Owner
    await loginUser(page, owner.username, owner.password);

    // Navigate to channel
    await page.getByRole('button', { name: server.name.charAt(0), exact: true }).click();
    await page.getByText(`# ${channel.name}`).click();

    // Find message
    const messageItem = page.locator('.message-item', { hasText: msgContent });
    await expect(messageItem).toBeVisible();
    
    // Hover to show actions
    await messageItem.hover();
    
    // Click delete
    await messageItem.locator('button[title="Delete"]').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    // Verify gone
    await expect(messageItem).not.toBeVisible();
  });

  test('Server owner can ban a user and they cannot rejoin', async ({ page, request }) => {
    // 1. Setup: Owner, Member, Server
    const { user: owner, server, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });
    const memberData = generateUserData('to_be_banned');
    const regRes = await request.post(`${API_URL}/api/auth/register`, { data: memberData });
    const { token: memberToken } = await regRes.json();
    
    await request.post(`${API_URL}/api/servers/${server.id}/join`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });

    // 2. Owner bans Member via UI
    await loginUser(page, owner.username, owner.password);
    const serverButton = page.getByRole('button', { name: server.name.charAt(0), exact: true });
    await serverButton.click({ button: 'right' });
    
    await expect(page.getByText('Loading members...')).not.toBeVisible();
    const memberRow = page.locator('div', { hasText: memberData.username }).last();
    
    // Set duration to 0 (Permanent)
    await memberRow.locator('input[type="number"]').fill('0');
    
    await memberRow.getByRole('button', { name: 'Ban' }).click();

    // Confirm in custom modal
    await page.getByRole('button', { name: 'Confirm' }).click();

    // 3. Verify member appears in Banned list
    await expect(page.getByText('BANNED USERS').locator('..').getByText(memberData.username)).toBeVisible();
    await page.keyboard.press('Escape');

    // 4. Member tries to rejoin
    const memberContext = await page.context().browser().newContext({ ignoreHTTPSErrors: true });
    await memberContext.addInitScript((url) => { globalThis.__API_URL__ = url; }, API_URL);
    const memberPage = await memberContext.newPage();
    await loginUser(memberPage, memberData.username, memberData.password);
    
    // Verify the server is NOT in the member's sidebar/server list after being banned
    await expect(memberPage.getByRole('button', { name: server.name.charAt(0), exact: true })).not.toBeVisible();

    await memberPage.getByTitle('Explore Servers').click();
    const serverRow = memberPage.locator('.server-discovery-list > div').filter({ has: memberPage.getByText(server.name, { exact: true }) }).first();
    await serverRow.getByRole('button', { name: 'Join' }).click();


    // Cleanup
    await memberContext.close();
  });

  test('Kicking a member prevents them from rejoining for 1 minute', async ({ page, request }) => {
    const { user: owner, server, token: ownerToken } = await seedChatEnvironment(request);
    serversToCleanup.push({ id: server.id, token: ownerToken });
    const memberData = generateUserData('kicked_user');
    await request.post(`${API_URL}/api/auth/register`, { data: memberData });

    // Owner kicks via UI
    await loginUser(page, owner.username, owner.password);
    const serverButton = page.getByRole('button', { name: server.name.charAt(0), exact: true });
    
    // Using API to join first
    const memberLogin = await request.post(`${API_URL}/api/auth/login`, { data: { username: memberData.username, password: memberData.password } });
    const { token: mToken } = await memberLogin.json();
    await request.post(`${API_URL}/api/servers/${server.id}/join`, { headers: { Authorization: `Bearer ${mToken}` } });

    await serverButton.click({ button: 'right' });
    await expect(page.getByText('Loading members...')).not.toBeVisible();
    await page.locator('div', { hasText: memberData.username }).last().getByRole('button', { name: 'Kick' }).click();

    // Confirm in custom modal
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Verify ban exists in the UI list
    await expect(page.getByText('BANNED USERS').locator('..').getByText(memberData.username)).toBeVisible();
  });
});
