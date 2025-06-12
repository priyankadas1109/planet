// src/main.js
import { getGoogleSheetData, updateFeed } from './services/googleSheetsService.js';
import { pullData, generateResponse, checkPulledData } from './services/dataService.js';
import { checkOtherAPIKeyRequirement } from './utils/uiHelpers.js';

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

  huggingFaceModelContainer.style.display = aiModel === "HuggingFace" ? "block" : "none";
  otherApiKeyContainer.style.display =
    ["Anthropic", "Google", "FireworksAI", "Groq", "MistralAI", "TogetherAI", "HuggingFace"].includes(aiModel)
      ? "block" : "none";
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
    <div class="w-full px-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-700">Your Interaction</h3>
            <textarea id="userQuery" class="w-full p-3 mt-2 border rounded-lg bg-white h-24" placeholder="Enter text to interact..."></textarea>

            <div class="flex items-center mb-3 mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 13.5v-1a.5.5 0 00-1 0v1a.5.5 0 001 0zm-.5-3.75a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
              </svg>
              <h3 class="text-lg font-semibold text-gray-800">AI Model</h3>
            </div>
            <select id="aiModel" class="w-full px-4 py-3 border rounded-lg" onchange="toggleModelInputs()">
              <option value="OpenAI">OpenAI</option>
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
            <div class="mt-3 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <p class="text-sm text-gray-600">Non-OpenAI models require an OpenAI API Key for embeddings</p>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">LLM API Key</h3>

            <div class="bg-white p-4 rounded-lg border border-gray-200">
              <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <div class="relative">
                <input id="apiKey" type="password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-800 placeholder-gray-400" placeholder="Enter your LLM's API key" />
                <button onclick="toggleVisibility('apiKey')" class="absolute inset-y-0 right-0 flex items-center px-4 text-gray-600 hover:text-blue-500 transition-colors duration-200" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
              <p class="mt-2 text-xs text-gray-500">Your API key is securely stored and never shared. <a href="/localsite/tools/storage/api#gonext=/planet/langchain/trade">🔑 Manage API Keys</a></p>
            </div>
          </div>

          <div id="githubTokenContainer" class="p-4 bg-white border rounded-lg border-gray-100">
            <div class="flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              <h3 class="text-lg font-semibold text-gray-800">GitHub Token</h3>
            </div>
            <div class="relative">
              <input id="githubToken" type="password" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-800 placeholder-gray-400" placeholder="Enter your GitHub personal access token" />
              <button type="button" onclick="toggleVisibility('githubToken')" class="absolute inset-y-0 right-0 flex items-center px-4 text-gray-600 hover:text-green-600 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <div class="mt-3 flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <p class="text-xs text-gray-600">Tokens with repo and workflow permissions are required for CI/CD operations.</p>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div class="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              <h3 class="text-lg font-semibold text-gray-800">Document Source</h3>
            </div>
            <select id="sourceType" class="w-full px-4 py-2 border rounded-lg" onchange="toggleSourceInput()">
              <option value="single">Single File</option>
              <option value="folder">GitHub Folder</option>
              <option value="repo">Entire GitHub Repo</option>
              <option value="feedAPI">Feed API</option>
            </select>
            <div id="sourceUrlContainer" class="mt-4">
              <label for="sourceUrl" class="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
              <input id="sourceUrl" class="w-full p-2.5 border rounded-lg mt-0" placeholder="Enter GitHub URL" />
            </div>
            <div id="feedApiContainer" class="hidden mt-4">
              <select id="apiFeeds" class="w-full px-4 py-2 border rounded-lg"></select>
            </div>
          </div>
          <div class="text-center">
            <button id="contextBtn" class="px-4 py-2 bg-gray-200 rounded-lg">View Context</button>
          </div>
        </div>
      </div>
      <div id="response" class="mt-6 p-5 bg-gray-100 rounded-lg text-gray-800 whitespace-pre-wrap min-h-16 border border-gray-200 overflow-auto"></div>
    </div>
    <div style="position:fixed; left:0px; bottom:0; width:100%; background-color: #555; text-align: center; padding-bottom:10px;">
      <button id="submitButton" style="max-width:200px" class="w-full bg-green-600 text-white py-3 rounded-lg mt-4 hover:bg-green-700 transition-all font-medium">Generate</button>
    </div>
  `;

  container.appendChild(wrapper);
  toggleModelInputs();
  toggleSourceInput();

  document.getElementById('submitButton')?.addEventListener('click', generateResponse);
  document.getElementById('contextBtn')?.addEventListener('click', checkPulledData);
  document.getElementById('aiModel')?.addEventListener('change', checkOtherAPIKeyRequirement);
  document.getElementById('apiFeeds')?.addEventListener('change', e => updateFeed(e.target.value));
  document.getElementById('sourceUrl')?.addEventListener('blur', e => {
    const url = e.target.value.trim();
    if (isValidGitHubUrl(url)) processGitHubUrl(url);
  });

  document.getElementById('sourceUrl')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const url = e.target.value.trim();
      if (isValidGitHubUrl(url)) processGitHubUrl(url);
    }
  });

  getGoogleSheetData();
});
