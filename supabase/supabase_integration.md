# ResQ Frontend JS & Supabase Integration Guide

This guide explains how to connect your HTML & Vanilla JavaScript application (`index.html` and `script.js`) to the newly built Supabase backend.

---

## 1. Include Supabase Client Library

Add the Supabase client CDN script in your `index.html` head section before your custom `script.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

---

## 2. Initialize the Supabase Client

Initialize the client at the top of your `script.js`:

```javascript
const supabaseUrl = 'https://zirvmdtbonemnomxleeu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcnZtZHRib25lbW5vbXhsZWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzM5MTQsImV4cCI6MjA5Njc0OTkxNH0.ED0mLPelog-BYIFYXcBXha2QuCxUtzeRFAemuSOzehE';

const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
```

---

## 3. Authentication Implementation

### A. Listen to Auth State Changes
This acts as your dynamic screen routing helper:

```javascript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    const user = session.user;
    showToast(`Welcome back, ${user.email}!`);
    
    // Check their preference mode
    const mode = await getUserMode(user.id);
    selectRole(mode === 'can_help' ? 'provider' : 'seeker');
    showScreen('s-app');
  } else if (event === 'SIGNED_OUT') {
    showScreen('s-landing');
  }
});
```

### B. Email & Password Registration (Sign Up)
```javascript
async function handleSignUp(email, password, fullName, phoneNumber) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone_number: phoneNumber
      }
    }
  });

  if (error) {
    showToast(`⚠️ Signup Error: ${error.message}`);
    return null;
  }
  showToast('✅ Account registered! Check your email for validation.');
  return data;
}
```

### C. Email & Password Sign In
```javascript
async function handleSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(`⚠️ Sign In Error: ${error.message}`);
    return null;
  }
  return data;
}
```

### D. Google Sign In
```javascript
async function handleGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) showToast(`⚠️ Google Error: ${error.message}`);
}
```

---

## 4. UI mode Management

> [!IMPORTANT]
> **Dynamic Mode Rule**:
> `current_mode` is only a UI/application preference and not a user identity or permission system. Users can always request help or provide help regardless of their active `current_mode`.

### A. Fetch Current App Mode Preference
```javascript
async function getUserMode(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('current_mode')
    .eq('id', userId)
    .single();

  if (error || !data) return 'need_help'; // Default fallback
  return data.current_mode;
}
```

### B. Toggle App Mode Preference (Can be done anytime)
```javascript
async function toggleUserMode(userId, currentMode) {
  const nextMode = currentMode === 'need_help' ? 'can_help' : 'need_help';
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ current_mode: nextMode })
    .eq('id', userId);

  if (error) {
    showToast(`⚠️ Error switching modes: ${error.message}`);
    return currentMode;
  }
  
  showToast(`Switched mode successfully to: ${nextMode === 'need_help' ? 'Seeking Help 🆘' : 'Offering Help 🤝'}`);
  return nextMode;
}
```

---

## 5. Resource Database Queries

### A. Query Active Resources (requires auth)
```javascript
async function fetchActiveResources(categoryFilter = 'all') {
  let query = supabase
    .from('resources')
    .select('*')
    .eq('status', 'active');

  if (categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching resources:', error);
    return [];
  }
  return data;
}
```

### B. Create a Resource Post
```javascript
async function postResource(userId, category, resourceType, title, description, location, lat, lng, contactNumber, urgency) {
  const { data, error } = await supabase
    .from('resources')
    .insert([{
      user_id: userId,
      category,
      resource_type: resourceType, // 'need' or 'offer'
      title,
      description,
      location,
      latitude: lat,
      longitude: lng,
      contact_number: contactNumber,
      urgency_level: urgency ? 'urgent' : 'standard',
      status: 'active'
    }])
    .select();

  if (error) {
    showToast(`⚠️ Post failed: ${error.message}`);
    return null;
  }
  showToast('✅ Resource posted successfully!');
  return data[0];
}
```

### C. Mark Resource Resolved (Fulfilled)
```javascript
async function fulfillResource(resourceId) {
  const { data, error } = await supabase
    .from('resources')
    .update({ status: 'fulfilled' })
    .eq('id', resourceId);

  if (error) {
    showToast(`⚠️ Error updating: ${error.message}`);
  } else {
    showToast('✅ Resource marked resolved!');
  }
}
```

---

## 6. One-to-One Chat System

### A. Get or Initialize a Unique Chat Thread
This checks for an existing thread between the participants for this specific resource before creating one, avoiding duplicate threads:

```javascript
async function getOrCreateChatThread(currentUserUid, otherUserUid, resourceId = null) {
  // Sort participants to match unique composite constraint logic
  const p1 = currentUserUid < otherUserUid ? currentUserUid : otherUserUid;
  const p2 = currentUserUid < otherUserUid ? otherUserUid : currentUserUid;
  
  // Try to find the chat
  let query = supabase
    .from('chats')
    .select('*')
    .eq('participant_1', p1)
    .eq('participant_2', p2);

  if (resourceId) {
    query = query.eq('resource_id', resourceId);
  } else {
    query = query.is('resource_id', null);
  }

  const { data: existingChats, error: queryError } = await query;
  if (existingChats && existingChats.length > 0) {
    return existingChats[0].id;
  }

  // Create new thread
  const { data: newChat, error: createError } = await supabase
    .from('chats')
    .insert([{
      participant_1: p1,
      participant_2: p2,
      resource_id: resourceId
    }])
    .select()
    .single();

  if (createError) {
    console.error('Chat creation error:', createError);
    return null;
  }
  return newChat.id;
}
```

### B. Send a Message
```javascript
async function sendMessage(chatId, senderId, textContent) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      chat_id: chatId,
      sender_id: senderId,
      content: textContent
    }]);

  if (error) console.error('Error sending message:', error);
}
```

### C. Mark Message as Read
```javascript
async function markMessageAsRead(messageId) {
  const { data, error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);

  if (error) {
    console.error('Error marking message read:', error);
  }
}
```

---

## 7. Realtime Setup (Instant Updates)

### A. Realtime Chat Messages
Update your chat UI immediately when the other participant sends a message:

```javascript
let activeChatChannel = null;

function subscribeChatRoom(chatId, onMessageReceived) {
  if (activeChatChannel) {
    supabase.removeChannel(activeChatChannel);
  }

  activeChatChannel = supabase
    .channel(`chat-room-${chatId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `chat_id=eq.${chatId}` 
    }, payload => {
      onMessageReceived(payload.new);
    })
    .subscribe();
}
```

### B. Realtime Global Resource Listing Alerts
Listen for new emergency needs or helper offers nearby:

```javascript
const resourceChannel = supabase
  .channel('public:resources')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'resources' 
  }, payload => {
    const post = payload.new;
    showToast(`🔔 New Resource Alert: ${post.title}`);
    // Optionally insert post on Map feed dynamically
  })
  .subscribe();
```

---

## 8. Storage uploads

### A. Upload Avatar Profile Photo
Uploads to the `avatars` bucket and updates the user's profile metadata path:

```javascript
async function uploadAvatarImage(userId, fileObject) {
  const fileExt = fileObject.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  // Upload the file to Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, fileObject, { upsert: true });

  if (uploadError) {
    showToast(`⚠️ Avatar upload failed: ${uploadError.message}`);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // Update profile
  await supabase
    .from('profiles')
    .update({ profile_photo: publicUrl })
    .eq('id', userId);

  showToast('✅ Profile photo updated successfully!');
  return publicUrl;
}
```

### B. Upload Resource Image (Future Expansion)
Uploads to the `resource-images` bucket:

```javascript
async function uploadResourceImage(userId, fileObject) {
  const fileExt = fileObject.name.split('.').pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('resource-images')
    .upload(filePath, fileObject);

  if (error) {
    showToast(`⚠️ Image upload failed: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('resource-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
```
