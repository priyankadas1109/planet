// ------------------------------------------------------------
// UI HELPER FUNCTIONS
// ------------------------------------------------------------

/**
 * Shows the CORS link in the UI
 */
export function showCORSLink() {
    document.getElementById('corsLink').style.display = 'block';
  }
  
  /**
   * Hides the CORS link in the UI
   */
  export function hideCORSLink() {
    document.getElementById('corsLink').style.display = 'none';
  }
  
  /**
   * Checks if another API key is needed based on selected service
   */
  export function checkOtherAPIKeyRequirement() {
    const chosenService = document.getElementById('aiModel').value;
    const otherApiKeyField = document.getElementById('otherApiKeyContainer');
    
    const needsOtherAPIKey = [
      "Anthropic", "Google", "FireworksAI", 
      "Groq", "MistralAI", "TogetherAI", "HuggingFace"
    ].includes(chosenService);
  
    // Show or hide the other API key field accordingly
    otherApiKeyField.style.display = needsOtherAPIKey ? "block" : "none";
  }
  
  /**
   * Updates UI to show loading state
   * @param {HTMLElement} button The button to update
   * @param {boolean} isLoading Whether the app is in loading state
   */
  export function setLoadingState(button, isLoading) {
    if (isLoading) {
      button.innerHTML = `<span class="animate-spin mr-2">⏳</span> Loading...`;
      button.disabled = true;
    } else {
      button.innerHTML = "Load the Data Source";
      button.disabled = false;
    }
  }