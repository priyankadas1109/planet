// ------------------------------------------------------------
// MAIN APPLICATION FILE
// ------------------------------------------------------------

import { getGoogleSheetData, updateFeed } from './services/googleSheetsService.js';
import { pullData, generateResponse, checkPulledData } from './services/dataService.js';
import { checkOtherAPIKeyRequirement, setLoadingState } from './utils/uiHelpers.js';

// ------------------------------------------------------------
// EVENT LISTENERS AND INITIALIZATION
// ------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  const submitButton = document.getElementById('submitButton');
  const loadDataButton = document.getElementById('loadData');
  const chosenService = document.getElementById('aiModel');
  const contextBtn = document.getElementById('contextBtn');
  const feedSelector = document.getElementById('apiFeeds');

  // Add event listeners
  contextBtn.addEventListener('click', checkPulledData);
  chosenService.addEventListener('change', checkOtherAPIKeyRequirement);
  feedSelector.addEventListener('change', (e) => updateFeed(e.target.value));
  
  // Initialize API key field visibility
  checkOtherAPIKeyRequirement();

  // Set up load data button
  loadDataButton.addEventListener('click', async () => {
    setLoadingState(loadDataButton, true);

    try {
      await pullData();
    } catch (error) {
      console.error('Error loading data:', error);
    }

    setLoadingState(loadDataButton, false);
  });

  // Set up submit button
  submitButton.addEventListener('click', async () => {
    await generateResponse();
  });
  
  // Initialize Google Sheets data
  getGoogleSheetData();
});

// Listen for CORS refresh button click event
document.addEventListener('click', function(event) {
  if (event.target.id === 'corsLink' && event.target.tagName === 'A') {
    alert("CORS passthrough enabled. Please refresh the page.");
  }
});