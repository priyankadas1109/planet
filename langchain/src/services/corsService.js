// ------------------------------------------------------------
// CORS SERVICE
// ------------------------------------------------------------

import { parseRSS } from '../utils/rssParser.js';
import { setTempData } from './dataService.js';

/**
 * Fetches data using CORS proxy
 * @param {string} url The URL to fetch data from
 */
export function fetchWithCORS(url) {
  console.log('Making CORS request to:', url);
  const proxyUrl = 'https://cors-anywhere.herokuapp.com/';

  fetch(proxyUrl + url)
    .then(response => {
      console.log('CORS Response Status:', response.status);
      return response.text();
    })
    .then(data => {
      console.log('CORS Response Data:', data);

      // Check if it is RSS format (XML)
      if (data.startsWith("<?xml")) {
        console.log("Received XML data, parsing...");
        parseRSS(data);
      } else {
        try {
          const jsonData = JSON.parse(data);
          setTempData(jsonData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
    })
    .catch(error => {
      console.error('CORS request failed:', error);
    });
}

/**
 * Fetches data directly (no CORS)
 * @param {string} url URL to fetch data from
 */
export function fetchData(url) {
  console.log('CORS not needed URL:', url);
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      console.log('Fetched data:', data);
      setTempData(data);
    })
    .catch(error => {
      console.error('Data fetch failed:', error);
    });
}