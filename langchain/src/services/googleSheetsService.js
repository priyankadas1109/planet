// ------------------------------------------------------------
// GOOGLE SHEETS SERVICE
// ------------------------------------------------------------

import { SPREADSHEET_ID, RANGE, API_KEY } from '../config/constants.js';
import { fetchData, fetchWithCORS } from './corsService.js';
import { setTempData } from './dataService.js';
import { showCORSLink, hideCORSLink } from '../utils/uiHelpers.js';

/**
 * Fetches data from Google Sheets API
 */
export function getGoogleSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
  
  console.log('Attempting to fetch Google Sheets data from:', url);
  
  fetch(url)
    .then(response => {
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Google Sheets API Success:', data);
      
      if (data.values && data.values.length > 0) {
        populateDropdown(data.values);
      } else {
        console.warn('No data found in Google Sheets response');
        showGoogleSheetsError('No data found in the Google Sheet');
      }
    })
    .catch(error => {
      console.error('Google Sheets API Error:', error);
      showGoogleSheetsError(`Failed to load data: ${error.message}`);
    });
}

/**
 * Populates dropdown with feed options
 * @param {Array} feedData Array of feed data from Google Sheets
 */
export function populateDropdown(feedData) {
  const selectElement = document.getElementById('apiFeeds');
  selectElement.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = "none";
  defaultOption.textContent = "Select a feed.......";
  selectElement.appendChild(defaultOption);

  feedData.forEach(feed => {
    const option = document.createElement('option');
    option.value = feed[0]; // Feed name
    option.textContent = feed[1];
    selectElement.appendChild(option);
  });

  // Restore last selected feed from localStorage
  const savedFeed = localStorage.getItem('selectedFeed');
  if (savedFeed) {
    selectElement.value = savedFeed;
    updateFeed(savedFeed);  // Automatically load previously selected feed
  }
}

/**
 * Fetches feed details from Google Sheets
 * @param {string} feedValue Feed name to fetch details for
 * @returns {Promise<Object>} Promise resolving to feed details
 */
export function fetchFeedDetails(feedValue) {
  return new Promise((resolve, reject) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        const feedRow = data.values.find(row => row[0] === feedValue);
        if (feedRow) {
          resolve({
            url: feedRow[9],  // Feed URL
            cors: feedRow[8]  // CORS requirement
          });
        } else {
          reject('Feed not found');
        }
      })
      .catch(error => reject(error));
  });
}

/**
 * Updates feed based on selection
 * @param {string} feedValue Selected feed value
 */
export function updateFeed(feedValue) {
  console.log(`Selected feed: ${feedValue}`);

  // Clear previous data
  document.getElementById('resultJson').innerHTML = '';
  document.getElementById('resultFull').innerHTML = '';

  localStorage.setItem('selectedFeed', feedValue);  // Save current selection

  fetchFeedDetails(feedValue).then(feedDetails => {
    if (feedDetails) {
      const { url, cors } = feedDetails;
      console.log(`Feed URL: ${url}, CORS Needed: ${cors}`);
      
      if (cors === "TRUE") {
        console.log('CORS Needed');
        showCORSLink();
        fetchWithCORS(url);
      } else {
        console.log('No CORS Needed');
        hideCORSLink();
        fetchData(url);
      }
    }
  }).catch(error => {
    console.error('Error fetching feed details:', error);
  });
}

/**
 * Displays data in the UI
 * @param {Object} data Data to display
 */
export function displayData(data) {
  const resultJson = document.getElementById('resultJson');
  resultJson.innerHTML = JSON.stringify(data, null, 2);
  setTempData(data);
}

/**
 * Displays Google Sheets error to user
 * @param {string} message Error message to display
 */
function showGoogleSheetsError(message) {
  const selectElement = document.getElementById('apiFeeds');
  if (selectElement) {
    selectElement.innerHTML = `<option value="error">Error: ${message}</option>`;
  }
  
  // Also show in console for debugging
  console.error('Google Sheets Error:', message);
}

/**
 * Tests Google Sheets API access
 * @returns {Promise<boolean>} True if API is accessible, false otherwise
 */
export async function testGoogleSheetsAPI() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.values) {
      console.log('✅ Google Sheets API test successful');
      return true;
    } else {
      console.error('❌ Google Sheets API test failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Google Sheets API test error:', error);
    return false;
  }
}

/**
 * Debug function to check various aspects of the Google Sheets setup
 */
export function debugGoogleSheetsSetup() {
  console.log('🔍 Google Sheets Debug Information:');
  console.log('Spreadsheet ID:', SPREADSHEET_ID);
  console.log('Range:', RANGE);
  console.log('API Key (first 10 chars):', API_KEY.substring(0, 10) + '...');
  console.log('Full API URL:', `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`);
  
  // Test the API
  testGoogleSheetsAPI().then(success => {
    if (success) {
      console.log('✅ Google Sheets API is working correctly');
    } else {
      console.log('❌ Google Sheets API has issues - check API key, permissions, and spreadsheet settings');
    }
  });
}