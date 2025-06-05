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
    <div class="max-w-4xl w-full bg-white card-shadow rounded-xl p-8 border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-700">Your Interaction</h3>
            <textarea id="userQuery" class="w-full p-3 mt-2 border rounded-lg bg-white h-24" placeholder="Enter text to interact..."></textarea>
            <div class="flex items-center mb-3 mt-4">
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
            <p class="text-sm text-gray-600 mt-2">Non-OpenAI models require an OpenAI API Key for embeddings</p>
          </div>
          <div id="huggingFaceModelContainer" class="hidden bg-gray-50 p-4 rounded-lg border">
            <h3 class="text-lg font-semibold text-gray-700">Hugging Face Model</h3>
            <input type="text" id="huggingFaceModel" class="w-full p-2.5 mt-2 border rounded-lg bg-white" placeholder="Enter model">
          </div>
          <div class="bg-gray-50 p-4 rounded-lg border">
            <h3 class="text-lg font-semibold text-gray-700">LLM API Key</h3>
            <input id="apiKey" type="password" class="w-full p-3 mt-2 border rounded-lg" placeholder="Enter your LLM API Key">
            <button onclick="toggleVisibility('apiKey')" class="mt-2 text-sm text-blue-600">👁 Show/Hide</button>
          </div>
          <div id="otherApiKeyContainer" class="hidden bg-gray-50 p-4 rounded-lg border">
            <h3 class="text-lg font-semibold text-gray-700">OpenAI API Key</h3>
            <input id="otherApiKey" type="text" class="w-full p-2.5 mt-2 border rounded-lg bg-white" placeholder="Enter OpenAI Key">
          </div>
          <div id="githubTokenContainer" class="p-4 bg-white border rounded-lg">
            <h3 class="text-lg font-semibold text-gray-800">GitHub Token</h3>
            <input id="githubToken" type="password" class="w-full px-4 py-2 border rounded-lg mt-2" placeholder="GitHub token">
            <button onclick="toggleVisibility('githubToken')" class="mt-2 text-sm text-green-600">👁 Show/Hide</button>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-lg border">
            <h3 class="text-lg font-semibold text-gray-800">Document Source</h3>
            <select id="sourceType" class="w-full px-4 py-2 border rounded-lg" onchange="toggleSourceInput()">
              <option value="single">Single File</option>
              <option value="folder">GitHub Folder</option>
              <option value="repo">Entire GitHub Repo</option>
              <option value="feedAPI">Feed API</option>
            </select>
            <div id="sourceUrlContainer" class="mt-4">
              <input id="sourceUrl" class="w-full p-2.5 border rounded-lg mt-2" placeholder="Enter GitHub URL">
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
      <div id="response" class="mt-6 p-4 bg-gray-100 rounded-lg"></div>
    </div>
    <div class="fixed bottom-0 left-0 w-full text-center bg-gray-700 p-2">
      <button id="submitButton" class="bg-green-600 text-white px-6 py-2 rounded-lg">Generate</button>
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
