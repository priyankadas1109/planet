// ------------------------------------------------------------
// RSS PARSER UTILITY
// ------------------------------------------------------------

import { setTempData } from '../services/dataService';

/**
 * Parses RSS/XML data
 * @param {string} xmlData XML data to parse
 */
export function parseRSS(xmlData) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlData, "text/xml");

  // Get all RSS items
  const items = xmlDoc.getElementsByTagName("item");
  const formattedItems = [];
  
  // Iterate through each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const link = item.querySelector("link") ? item.querySelector("link").textContent : "No link";
    const description = item.querySelector("description") ? item.querySelector("description").textContent : "No description";
    const pubDate = item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : "No date";
    const guid = item.querySelector("guid") ? item.querySelector("guid").textContent : "No GUID";

    formattedItems.push({
      link,
      description,
      pubDate,
      guid
    });
  }

  console.log("Parsed RSS Items:", formattedItems);
  setTempData(formattedItems);
}