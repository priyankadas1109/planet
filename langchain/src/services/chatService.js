// ------------------------------------------------------------
// CHAT SERVICE
// ------------------------------------------------------------

import { initializeLLM, generateHuggingFaceResponse } from './llmService.js';
import { saveChatHistory, getChatHistory } from './storageService.js';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

// Global chat history storage
let currentChatHistory = new ChatMessageHistory();
let conversationHistory = [];

/**
 * Initialize chat service and load previous conversations
 */
export function initializeChatService() {
  // Load previous chat history from localStorage
  const storedHistory = getChatHistory();
  conversationHistory = storedHistory;
  
  // Populate chat UI if it exists
  displayChatHistory();
}

/**
 * Enhanced chat prompt template for conversational AI
 */
const CHAT_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert AI assistant with access to GitHub repository data. 
    You can help users understand code, documentation, and repository contents.
    
    Available Context:
    {context}
    
    Instructions:
    - Provide detailed, accurate responses based on the repository context
    - If asked about code, explain it clearly with examples when possible
    - If the question is unrelated to the repository context, politely redirect
    - Maintain a helpful and professional tone
    - Reference specific files or sections when relevant`
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"]
]);

/**
 * Generate a chat response with conversation history
 * @param {string} userMessage The user's message
 * @param {string} context The repository context
 * @returns {Promise<string>} The AI response
 */
export async function generateChatResponse(userMessage, context = "") {
  const { llm, embeddings, huggingface } = initializeLLM();
  
  try {
    let response;
    
    if (!huggingface) {
      // Use LangChain with conversation history
      const chain = RunnableSequence.from([
        {
          input: new RunnablePassthrough(),
          chat_history: () => currentChatHistory.getMessages(),
          context: () => context
        },
        CHAT_PROMPT,
        llm
      ]);
      
      const result = await chain.invoke({ input: userMessage });
      response = result.content;
    } else {
      // Use HuggingFace API
      const conversationPrompt = buildConversationPrompt(userMessage, context);
      response = await generateHuggingFaceResponse(context, userMessage, conversationPrompt);
    }
    
    // Add messages to history
    await currentChatHistory.addMessage({ role: "human", content: userMessage });
    await currentChatHistory.addMessage({ role: "assistant", content: response });
    
    // Update conversation history for UI
    conversationHistory.push(
      { role: "user", content: userMessage, timestamp: new Date().toISOString() },
      { role: "assistant", content: response, timestamp: new Date().toISOString() }
    );
    
    // Save to localStorage
    saveChatHistory(conversationHistory);
    
    return response;
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I apologize, but I encountered an error while processing your message. Please try again.";
  }
}

/**
 * Build conversation prompt for HuggingFace models
 * @param {string} userMessage Current user message
 * @param {string} context Repository context
 * @returns {string} Formatted conversation prompt
 */
function buildConversationPrompt(userMessage, context) {
  let prompt = `Context from repository:\n${context}\n\n`;
  
  // Add recent conversation history
  const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
  recentHistory.forEach(msg => {
    if (msg.role === "user") {
      prompt += `Human: ${msg.content}\n`;
    } else {
      prompt += `Assistant: ${msg.content}\n`;
    }
  });
  
  prompt += `Human: ${userMessage}\nAssistant:`;
  return prompt;
}

/**
 * Create and manage chat interface in the UI
 */
export function createChatInterface() {
  const container = document.getElementById('chat-container');
  if (!container) return;
  
  const chatInterface = document.createElement('div');
  chatInterface.innerHTML = `
    <div class="chat-interface bg-white rounded-lg border border-gray-200 shadow-lg">
      <div class="chat-header bg-blue-600 text-white p-4 rounded-t-lg">
        <h3 class="text-lg font-semibold flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
          </svg>
          Planet Langchain Chat
        </h3>
        <div class="flex space-x-2 mt-2">
          <button id="clearChatBtn" class="text-sm bg-blue-500 hover:bg-blue-700 px-3 py-1 rounded">
            Clear Chat
          </button>
          <button id="saveChatBtn" class="text-sm bg-green-500 hover:bg-green-700 px-3 py-1 rounded">
            Save Keys
          </button>
        </div>
      </div>
      
      <div id="chatMessages" class="chat-messages h-96 overflow-y-auto p-4 space-y-4">
        <div class="text-center text-gray-500 text-sm">
          Start a conversation about your GitHub repository...
        </div>
      </div>
      
      <div class="chat-input border-t border-gray-200 p-4">
        <div class="flex space-x-2">
          <input 
            type="text" 
            id="chatInput" 
            placeholder="Ask about the repository..." 
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
          <button 
            id="sendChatBtn" 
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  `;
  
  container.appendChild(chatInterface);
  
  // Add event listeners
  document.getElementById('sendChatBtn')?.addEventListener('click', handleChatSend);
  document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
  });
  document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
  document.getElementById('saveChatBtn')?.addEventListener('click', () => {
    const { saveCurrentApiKeys } = require('./storageService.js');
    saveCurrentApiKeys();
    showNotification('API keys saved successfully!');
  });
  
  // Load existing chat history
  displayChatHistory();
}

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
  
  // Add user message to UI
  addMessageToUI('user', message);
  
  try {
    // Get context from loaded repository data
    const context = getRepositoryContext();
    
    // Generate response
    const response = await generateChatResponse(message, context);
    
    // Add assistant response to UI
    addMessageToUI('assistant', response);
  } catch (error) {
    console.error('Chat error:', error);
    addMessageToUI('assistant', 'Sorry, I encountered an error. Please try again.');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }
}

/**
 * Add a message to the chat UI
 * @param {string} role The role ('user' or 'assistant')
 * @param {string} content The message content
 */
function addMessageToUI(role, content) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const isUser = role === 'user';
  messageDiv.innerHTML = `
    <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
      <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 text-gray-800'
      }">
        <div class="text-sm font-medium mb-1">
          ${isUser ? 'You' : 'AI Assistant'}
        </div>
        <div class="text-sm whitespace-pre-wrap">${content}</div>
        <div class="text-xs mt-1 opacity-75">
          ${new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Display existing chat history in the UI
 */
function displayChatHistory() {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer || conversationHistory.length === 0) return;
  
  // Clear existing messages except welcome message
  messagesContainer.innerHTML = '';
  
  conversationHistory.forEach(msg => {
    addMessageToUI(msg.role === 'user' ? 'user' : 'assistant', msg.content);
  });
}

/**
 * Clear chat history
 */
function clearChat() {
  conversationHistory = [];
  currentChatHistory = new ChatMessageHistory();
  saveChatHistory(conversationHistory);
  
  const messagesContainer = document.getElementById('chatMessages');
  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div class="text-center text-gray-500 text-sm">
        Chat cleared. Start a new conversation...
      </div>
    `;
  }
  
  showNotification('Chat history cleared!');
}

/**
 * Get repository context for chat
 * @returns {string} Formatted repository context
 */
function getRepositoryContext() {
  // This should integrate with your existing data service
  const { checkPulledData } = require('./dataService.js');
  const pulledData = checkPulledData();
  
  if (!pulledData || !Array.isArray(pulledData)) {
    return "No repository data currently loaded. Please load a GitHub repository first.";
  }
  
  // Format the context from pulled data
  const contextSummary = pulledData.slice(0, 5).map((doc, i) => 
    `File ${i + 1}: ${doc.metadata?.source || 'Unknown'}\n${doc.pageContent?.substring(0, 500)}...`
  ).join('\n\n');
  
  return `Repository contains ${pulledData.length} files. Here's a sample:\n\n${contextSummary}`;
}

/**
 * Show notification to user
 * @param {string} message Notification message
 */
function showNotification(message) {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
} 