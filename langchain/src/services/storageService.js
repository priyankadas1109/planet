// ------------------------------------------------------------
// LOCAL STORAGE SERVICE
// ------------------------------------------------------------

/**
 * Service for managing local storage of API keys and configuration
 */

const STORAGE_KEYS = {
  API_KEYS: 'planet_langchain_api_keys',
  CONFIG: 'planet_langchain_config',
  CHAT_HISTORY: 'planet_langchain_chat_history'
};

/**
 * Save API key to local storage
 * @param {string} provider The API provider (e.g., 'openai', 'anthropic')
 * @param {string} apiKey The API key to store
 */
export function saveApiKey(provider, apiKey) {
  try {
    const existingKeys = getStoredApiKeys();
    existingKeys[provider] = apiKey;
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(existingKeys));
    console.log(`API key saved for ${provider}`);
  } catch (error) {
    console.error('Error saving API key:', error);
  }
}

/**
 * Get stored API key for a provider
 * @param {string} provider The API provider
 * @returns {string|null} The stored API key or null if not found
 */
export function getApiKey(provider) {
  try {
    const keys = getStoredApiKeys();
    return keys[provider] || null;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
}

/**
 * Get all stored API keys
 * @returns {Object} Object containing all stored API keys
 */
export function getStoredApiKeys() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error retrieving stored API keys:', error);
    return {};
  }
}

/**
 * Remove API key for a provider
 * @param {string} provider The API provider
 */
export function removeApiKey(provider) {
  try {
    const keys = getStoredApiKeys();
    delete keys[provider];
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    console.log(`API key removed for ${provider}`);
  } catch (error) {
    console.error('Error removing API key:', error);
  }
}

/**
 * Clear all stored API keys
 */
export function clearAllApiKeys() {
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEYS);
    console.log('All API keys cleared');
  } catch (error) {
    console.error('Error clearing API keys:', error);
  }
}

/**
 * Save chat history
 * @param {Array} chatHistory Array of chat messages
 */
export function saveChatHistory(chatHistory) {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chatHistory));
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
}

/**
 * Get stored chat history
 * @returns {Array} Array of chat messages
 */
export function getChatHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return [];
  }
}

/**
 * Clear chat history
 */
export function clearChatHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    console.log('Chat history cleared');
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
}

/**
 * Save application configuration
 * @param {Object} config Configuration object
 */
export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
}

/**
 * Get stored configuration
 * @returns {Object} Configuration object
 */
export function getConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error retrieving configuration:', error);
    return {};
  }
}

/**
 * Auto-populate API key fields from storage
 */
export function loadStoredApiKeys() {
  const keys = getStoredApiKeys();
  
  // Map providers to their corresponding input field IDs
  const providerMap = {
    'openai': 'apiKey',
    'anthropic': 'apiKey',
    'google': 'apiKey',
    'cohere': 'apiKey',
    'fireworks': 'apiKey',
    'groq': 'apiKey',
    'mistral': 'apiKey',
    'together': 'apiKey',
    'huggingface': 'apiKey',
    'azure': 'apiKey',
    'openai_secondary': 'otherApiKey'
  };

  Object.entries(keys).forEach(([provider, key]) => {
    const fieldId = providerMap[provider];
    if (fieldId) {
      const field = document.getElementById(fieldId);
      if (field && key) {
        field.value = key;
      }
    }
  });

  // Load GitHub token
  if (keys.github) {
    const githubField = document.getElementById('githubToken');
    if (githubField) {
      githubField.value = keys.github;
    }
  }
}

/**
 * Save current API keys from form inputs
 */
export function saveCurrentApiKeys() {
  const aiModel = document.getElementById('aiModel')?.value.toLowerCase();
  const apiKey = document.getElementById('apiKey')?.value;
  const otherApiKey = document.getElementById('otherApiKey')?.value;
  const githubToken = document.getElementById('githubToken')?.value;

  if (apiKey) {
    saveApiKey(aiModel, apiKey);
  }
  
  if (otherApiKey) {
    saveApiKey('openai_secondary', otherApiKey);
  }
  
  if (githubToken) {
    saveApiKey('github', githubToken);
  }
} 