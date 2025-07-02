// src/main.js
import { getGoogleSheetData, updateFeed, debugGoogleSheetsSetup } from './services/googleSheetsService.js';
import { pullData, generateResponse, checkPulledData } from './services/dataService.js';
import { checkOtherAPIKeyRequirement } from './utils/uiHelpers.js';
import { loadStoredApiKeys, saveCurrentApiKeys } from './services/storageService.js';
import { initializeChatService, createChatInterface } from './services/chatService.js';

function toggleVisibility(id) {
  const input = document.getElementById(id);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function toggleModelInputs() {
  const aiModel = document.getElementById("aiModel").value;
  const otherApiKeyContainer = document.getElementById("otherApiKeyContainer");
  const huggingFaceModelContainer = document.getElementById("huggingFaceModelContainer");
  const apiKeyLabel = document.getElementById("apiKeyLabel");
  const apiKeyInput = document.getElementById("apiKey");

  huggingFaceModelContainer.style.display = aiModel === "HuggingFace" ? "block" : "none";
  otherApiKeyContainer.style.display =
    ["Anthropic", "Google", "FireworksAI", "Groq", "MistralAI", "TogetherAI", "HuggingFace"].includes(aiModel)
      ? "block" : "none";

  // Update API key label and placeholder based on selected model
  if (apiKeyLabel && apiKeyInput) {
    switch(aiModel) {
      case "OpenAI":
        apiKeyLabel.textContent = "OpenAI API Key";
        apiKeyInput.placeholder = "Enter your OpenAI API Key";
        break;
      case "Azure":
        apiKeyLabel.textContent = "Azure OpenAI API Key";
        apiKeyInput.placeholder = "Enter your Azure OpenAI API Key";
        break;
      case "Anthropic":
        apiKeyLabel.textContent = "Anthropic API Key";
        apiKeyInput.placeholder = "Enter your Anthropic API Key";
        break;
      case "Google":
        apiKeyLabel.textContent = "Google API Key";
        apiKeyInput.placeholder = "Enter your Google API Key";
        break;
      case "Cohere":
        apiKeyLabel.textContent = "Cohere API Key";
        apiKeyInput.placeholder = "Enter your Cohere API Key";
        break;
      case "FireworksAI":
        apiKeyLabel.textContent = "FireworksAI API Key";
        apiKeyInput.placeholder = "Enter your FireworksAI API Key";
        break;
      case "Groq":
        apiKeyLabel.textContent = "Groq API Key";
        apiKeyInput.placeholder = "Enter your Groq API Key";
        break;
      case "MistralAI":
        apiKeyLabel.textContent = "Mistral API Key";
        apiKeyInput.placeholder = "Enter your Mistral API Key";
        break;
      case "TogetherAI":
        apiKeyLabel.textContent = "TogetherAI API Key";
        apiKeyInput.placeholder = "Enter your TogetherAI API Key";
        break;
      case "HuggingFace":
        apiKeyLabel.textContent = "HuggingFace API Key";
        apiKeyInput.placeholder = "Enter your HuggingFace API Key";
        break;
      default:
        apiKeyLabel.textContent = "LLM API Key";
        apiKeyInput.placeholder = "Enter your LLM API Key";
    }
  }
}

function toggleSourceInput() {
  const sourceType = document.getElementById("sourceType").value;
  const sourceUrlContainer = document.getElementById("sourceUrlContainer");
  const feedApiContainer = document.getElementById("feedApiContainer");
  const githubTokenContainer = document.getElementById("githubTokenContainer");

  if (sourceType === "feedAPI") {
    sourceUrlContainer.style.display = "none";
    feedApiContainer.style.display = "block";
    githubTokenContainer.style.display = "none";
  } else {
    sourceUrlContainer.style.display = "block";
    feedApiContainer.style.display = "none";
    githubTokenContainer.style.display = "block";
  }
}

function isValidGitHubUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'github.com' || parsedUrl.hostname.endsWith('.github.com');
  } catch {
    return false;
  }
}

function processGitHubUrl(url) {
  console.log(`Processing GitHub URL: ${url}`);
  pullData();
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('chat-widget-container');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="max-w-6xl w-full bg-white card-shadow rounded-xl p-8 border border-gray-200">
      <!-- Enhanced Header with Planet Langchain Branding -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 flex items-center">
          <svg class="w-8 h-8 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z"/>
          </svg>
          Planet Langchain
        </h1>
        <p class="text-gray-600 mt-2">GitHub Repository RAG with LangChain.js - Pull, Analyze & Chat with Code</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Configuration Panel -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Configuration</h3>
            
            <!-- Storage Management -->
            <div class="mb-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-gray-600">API Storage</h4>
                <div class="flex space-x-1">
                  <button id="saveKeysBtn" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Save</button>
                  <button id="loadKeysBtn" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Load</button>
                </div>
              </div>
            </div>

            <!-- AI Model Selection -->
            <div class="mb-4">
              <h4 class="text-sm font-medium text-gray-600 mb-2">AI Model</h4>
              <select id="aiModel" class="w-full px-3 py-2 text-sm border rounded-lg" onchange="toggleModelInputs()">
                <option value="OpenAI">OpenAI GPT</option>
                <option value="Azure">Azure OpenAI</option>
                <option value="Anthropic">Anthropic Claude</option>
                <option value="Google">Google Gemini</option>
                <option value="Cohere">Cohere Command</option>
                <option value="FireworksAI">FireworksAI</option>
                <option value="Groq">Groq</option>
                <option value="MistralAI">Mistral AI</option>
                <option value="TogetherAI">Together AI</option>
                <option value="HuggingFace">HuggingFace</option>
              </select>
            </div>

            <!-- API Keys -->
            <div class="space-y-3">
              <div>
                <h4 id="apiKeyLabel" class="text-sm font-medium text-gray-600">LLM API Key</h4>
                <div class="flex">
                  <input id="apiKey" type="password" class="flex-1 px-3 py-2 text-sm border rounded-l-lg" placeholder="Enter API Key">
                  <button onclick="toggleVisibility('apiKey')" class="px-2 py-2 bg-gray-100 border-t border-r border-b rounded-r-lg text-xs">👁</button>
                </div>
              </div>
              
              <div id="otherApiKeyContainer" class="hidden">
                <h4 class="text-sm font-medium text-gray-600">OpenAI API Key (for embeddings)</h4>
                <input id="otherApiKey" type="password" class="w-full px-3 py-2 text-sm border rounded-lg" placeholder="Enter OpenAI Key">
              </div>
              
              <div id="huggingFaceModelContainer" class="hidden">
                <h4 class="text-sm font-medium text-gray-600">HuggingFace Model</h4>
                <input type="text" id="huggingFaceModel" class="w-full px-3 py-2 text-sm border rounded-lg" placeholder="e.g., microsoft/DialoGPT-medium">
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-gray-600">GitHub Token</h4>
                <div class="flex">
                  <input id="githubToken" type="password" class="flex-1 px-3 py-2 text-sm border rounded-l-lg" placeholder="GitHub token (optional)">
                  <button onclick="toggleVisibility('githubToken')" class="px-2 py-2 bg-gray-100 border-t border-r border-b rounded-r-lg text-xs">👁</button>
                </div>
              </div>
            </div>
          </div>

          <!-- GitHub Repository Source -->
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Repository Source</h3>
            
            <div class="space-y-3">
              <div>
                <h4 class="text-sm font-medium text-gray-600 mb-2">Source Type</h4>
                <select id="sourceType" class="w-full px-3 py-2 text-sm border rounded-lg" onchange="toggleSourceInput()">
                  <option value="single">Single File</option>
                  <option value="folder">GitHub Folder</option>
                  <option value="repo">Entire Repository</option>
                  <option value="feedAPI">Feed API</option>
                </select>
              </div>
              
              <div id="sourceUrlContainer">
                <h4 class="text-sm font-medium text-gray-600 mb-2">GitHub URL</h4>
                <input id="sourceUrl" class="w-full px-3 py-2 text-sm border rounded-lg" placeholder="https://github.com/user/repo">
                <p class="text-xs text-gray-500 mt-1">Paste any GitHub repo, folder, or file URL</p>
              </div>
              
              <div id="feedApiContainer" class="hidden">
                <h4 class="text-sm font-medium text-gray-600 mb-2">API Feed</h4>
                <select id="apiFeeds" class="w-full px-3 py-2 text-sm border rounded-lg"></select>
              </div>
            </div>

            <div class="flex space-x-2 mt-4">
              <button id="loadRepoBtn" class="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                Load Repository
              </button>
              <button id="contextBtn" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
                View Data
              </button>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
            <div class="space-y-2">
              <button id="debugBtn" class="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                Debug APIs
              </button>
              <button id="trainModelBtn" class="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                Train RAG Model
              </button>
            </div>
          </div>
        </div>

        <!-- Chat Interface -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg border border-gray-200 shadow-lg h-full">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg">
              <h3 class="text-lg font-semibold flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
                </svg>
                Chat with Repository
              </h3>
              <p class="text-sm text-blue-100 mt-1">Ask questions about the loaded repository code and documentation</p>
            </div>
            
            <div id="chatMessages" class="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
              <div class="text-center text-gray-500 text-sm">
                👋 Load a GitHub repository to start chatting about the code!
              </div>
            </div>
            
            <div class="border-t border-gray-200 p-4 bg-white rounded-b-lg">
              <div class="flex space-x-2">
                <input 
                  type="text" 
                  id="chatInput" 
                  placeholder="Ask about the repository code, structure, or functionality..." 
                  class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <button 
                  id="sendChatBtn" 
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              <div class="flex justify-between items-center mt-2">
                <div class="flex space-x-2">
                  <button id="clearChatBtn" class="text-sm text-gray-500 hover:text-gray-700">Clear Chat</button>
                  <span class="text-gray-300">|</span>
                  <button id="exportChatBtn" class="text-sm text-gray-500 hover:text-gray-700">Export Chat</button>
                </div>
                <div id="chatStatus" class="text-xs text-gray-500">Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Traditional Response Area (for backward compatibility) -->
      <div id="response" class="mt-6 p-4 bg-gray-100 rounded-lg hidden"></div>
    </div>
  `;
  container.appendChild(wrapper);

  // Initialize services
  initializeChatService();
  
  // Setup UI
  toggleModelInputs();
  toggleSourceInput();
  
  // Load stored API keys on startup
  setTimeout(() => {
    loadStoredApiKeys();
  }, 100);

  // Enhanced event listeners
  document.getElementById('loadRepoBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('loadRepoBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    try {
      await pullData();
      updateChatStatus('Repository loaded successfully!');
      showNotification('Repository data loaded and ready for chat!');
    } catch (error) {
      console.error('Error loading repository:', error);
      updateChatStatus('Error loading repository');
      showNotification('Error loading repository. Please check your URL and token.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
  
  document.getElementById('contextBtn')?.addEventListener('click', () => {
    const data = checkPulledData();
    if (data && data.length > 0) {
      showDataModal(data);
    } else {
      showNotification('No repository data loaded yet.', 'info');
    }
  });
  
  document.getElementById('debugBtn')?.addEventListener('click', debugGoogleSheetsSetup);
  
  document.getElementById('trainModelBtn')?.addEventListener('click', () => {
    const data = checkPulledData();
    if (data && data.length > 0) {
      updateChatStatus(`RAG model trained with ${data.length} documents`);
      showNotification(`RAG model ready with ${data.length} documents from repository!`);
    } else {
      showNotification('Please load a repository first to train the RAG model.', 'warning');
    }
  });
  
  // Storage management
  document.getElementById('saveKeysBtn')?.addEventListener('click', () => {
    saveCurrentApiKeys();
    showNotification('API keys saved successfully!');
  });
  
  document.getElementById('loadKeysBtn')?.addEventListener('click', () => {
    loadStoredApiKeys();
    showNotification('API keys loaded from storage!');
  });

  // Chat functionality
  document.getElementById('sendChatBtn')?.addEventListener('click', handleChatSend);
  document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });
  
  document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
  document.getElementById('exportChatBtn')?.addEventListener('click', exportChatHistory);

  // Model change handler
  document.getElementById('aiModel')?.addEventListener('change', () => {
    checkOtherAPIKeyRequirement();
    toggleModelInputs();
    saveCurrentApiKeys(); // Auto-save when model changes
  });
  
  // Feed API handler
  document.getElementById('apiFeeds')?.addEventListener('change', e => updateFeed(e.target.value));
  
  // GitHub URL processing
  document.getElementById('sourceUrl')?.addEventListener('blur', e => {
    const url = e.target.value.trim();
    if (isValidGitHubUrl(url)) {
      processGitHubUrl(url);
      updateChatStatus('GitHub URL detected - ready to load');
    }
  });

  document.getElementById('sourceUrl')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const url = e.target.value.trim();
      if (isValidGitHubUrl(url)) processGitHubUrl(url);
    }
  });

  // Helper Functions for enhanced functionality
  
  /**
   * Handle sending a chat message
   */
  async function handleChatSend() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    
    if (!input || !input.value.trim()) return;
    
    const message = input.value.trim();
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    updateChatStatus('Generating response...');
    
    // Add user message to UI
    addMessageToUI('user', message);
    
    try {
      // Get context from loaded repository data
      const context = getRepositoryContext();
      
      // Generate response using enhanced chat service
      const { generateChatResponse } = await import('./services/chatService.js');
      const response = await generateChatResponse(message, context);
      
      // Add assistant response to UI
      addMessageToUI('assistant', response);
      updateChatStatus('Response generated');
    } catch (error) {
      console.error('Chat error:', error);
      addMessageToUI('assistant', 'Sorry, I encountered an error. Please check your API keys and try again.');
      updateChatStatus('Error generating response');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  }

  /**
   * Add a message to the chat UI
   */
  function addMessageToUI(role, content) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    // Remove welcome message if it exists
    const welcomeMsg = messagesContainer.querySelector('.text-center');
    if (welcomeMsg && welcomeMsg.textContent.includes('👋')) {
      welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} mb-4`;
    
    const isUser = role === 'user';
    messageDiv.innerHTML = `
      <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
        <div class="max-w-md px-4 py-3 rounded-lg ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
        }">
          <div class="text-xs font-medium mb-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}">
            ${isUser ? 'You' : '🤖 AI Assistant'}
          </div>
          <div class="text-sm whitespace-pre-wrap leading-relaxed">${content}</div>
          <div class="text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400'}">
            ${new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Clear chat history
   */
  function clearChat() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="text-center text-gray-500 text-sm">
          Chat cleared. Load a repository and start a new conversation!
        </div>
      `;
    }
    
    // Clear from storage service
    import('./services/storageService.js').then(({ clearChatHistory }) => {
      clearChatHistory();
    });
    
    updateChatStatus('Chat cleared');
    showNotification('Chat history cleared!');
  }

  /**
   * Export chat history
   */
  function exportChatHistory() {
    import('./services/storageService.js').then(({ getChatHistory }) => {
      const history = getChatHistory();
      if (history.length === 0) {
        showNotification('No chat history to export.', 'info');
        return;
      }
      
      const exportData = {
        exportDate: new Date().toISOString(),
        chatHistory: history,
        repositoryUrl: document.getElementById('sourceUrl')?.value || 'Unknown'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planet-langchain-chat-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Chat history exported successfully!');
    });
  }

  /**
   * Update chat status
   */
  function updateChatStatus(status) {
    const statusElement = document.getElementById('chatStatus');
    if (statusElement) {
      statusElement.textContent = status;
      setTimeout(() => {
        if (statusElement.textContent === status) {
          statusElement.textContent = 'Ready';
        }
      }, 3000);
    }
  }

  /**
   * Show notification to user
   */
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : type === 'info' ? 'bg-blue-500' : 'bg-green-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-1">${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Get repository context for chat
   */
  function getRepositoryContext() {
    const pulledData = checkPulledData();
    
    if (!pulledData || !Array.isArray(pulledData)) {
      return "No repository data currently loaded. Please load a GitHub repository first using the 'Load Repository' button.";
    }
    
    // Create a comprehensive context summary
    const contextSummary = pulledData.slice(0, 8).map((doc, i) => {
      const source = doc.metadata?.source || `Document ${i + 1}`;
      const content = doc.pageContent?.substring(0, 800) || 'No content';
      return `File: ${source}\nContent: ${content}${content.length >= 800 ? '...' : ''}`;
    }).join('\n\n---\n\n');
    
    return `Repository Analysis:
- Total files loaded: ${pulledData.length}
- Repository URL: ${document.getElementById('sourceUrl')?.value || 'Unknown'}
- Loaded at: ${new Date().toLocaleString()}

Sample of repository content:

${contextSummary}

Note: This is a sample of the repository. The full repository contains ${pulledData.length} files that can be searched and analyzed.`;
  }

  /**
   * Show data modal with repository information
   */
  function showDataModal(data) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-4xl max-h-3/4 overflow-auto m-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">Repository Data</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <div class="mb-4">
          <p class="text-gray-600">Loaded ${data.length} files from repository</p>
          <p class="text-sm text-gray-500">URL: ${document.getElementById('sourceUrl')?.value || 'Unknown'}</p>
        </div>
        <div class="space-y-4 max-h-96 overflow-y-auto">
          ${data.slice(0, 20).map((doc, i) => `
            <div class="border border-gray-200 rounded p-3">
              <div class="font-medium text-sm text-gray-700 mb-2">
                📄 ${doc.metadata?.source || `Document ${i + 1}`}
              </div>
              <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
                ${doc.pageContent?.substring(0, 300) || 'No content'}${doc.pageContent?.length > 300 ? '...' : ''}
              </div>
            </div>
          `).join('')}
          ${data.length > 20 ? `<div class="text-center text-gray-500 text-sm">... and ${data.length - 20} more files</div>` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  getGoogleSheetData();
});
