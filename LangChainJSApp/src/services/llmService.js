// ------------------------------------------------------------
// LLM SERVICE
// ------------------------------------------------------------

// API Integrations
import { 
    OpenAIEmbeddings, 
    ChatOpenAI, 
    AzureChatOpenAI, 
    AzureOpenAIEmbeddings 
  } from "@langchain/openai";
  import { ChatXAI } from "@langchain/xai";
  import { ChatAnthropic } from "@langchain/anthropic";
  import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
  import { TogetherAI } from "@langchain/community/llms/togetherai";
  import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
  import { ChatCohere, CohereEmbeddings } from "@langchain/cohere";
  import { ChatGroq } from "@langchain/groq";
  import { MistralAI } from "@langchain/mistralai";
  import { textGeneration } from "@huggingface/inference";
  
  /**
   * Initializes an LLM based on the user's selection
   * @returns {Object} Object containing the LLM and embeddings model
   */
  export function initializeLLM() {
    const apiKey = document.getElementById('apiKey').value;
    const chosenService = document.getElementById("aiModel").value;
    let llm;
    let embeddings;
    let needOtherAPIKey = false;
    let huggingface = false;
  
    switch(chosenService) {
      case "OpenAI":
        llm = new ChatOpenAI({
          model: "gpt-4o-mini",
          temperature: 0,
          apiKey: apiKey
        });
        embeddings = new OpenAIEmbeddings({
          model: "text-embedding-3-small",
          apiKey: apiKey
        });
        break;
      case "Anthropic":
        llm = new ChatAnthropic({
          model: "claude-3-5-sonnet-20240620",
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "Azure":
        llm = new AzureChatOpenAI({
          model: "gpt-4o",
          temperature: 0,
          azureOpenAIApiKey: apiKey
        });
        embeddings = new AzureOpenAIEmbeddings({
          azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-ada-002"
        });
        break;
      case "Google":
        llm = new ChatGoogleGenerativeAI({
          model: "gemini-1.5-pro",
          temperature: 0,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "Cohere":
        llm = new ChatCohere({
          model: "command-r-plus",
          temperature: 0,
          apiKey: apiKey
        });
        embeddings = new CohereEmbeddings({
          model: "embed-english-v3.0"
        });
        break;
      case "FireworksAI":
        llm = new ChatFireworks({
          model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
          temperature: 0,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "Groq":
        llm = new ChatGroq({
          model:"mixtral-8x7b-32768",
          temperature: 0,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "MistralAI":
        llm = new MistralAI({
          model: "codestral-latest",
          temperature: 0,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "TogetherAI":
        llm = new TogetherAI({
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
          maxTokens: 256,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "HuggingFace":
        needOtherAPIKey = true;
        huggingface = true;
        break;
      default:
        console.log("Invalid LLM model selected");
    }
  
    // Handle models requiring separate embedding API key
    if (needOtherAPIKey) {
      const otherAPIKey = document.getElementById('otherApiKey').value;
      embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: otherAPIKey
      });
    }
  
    return { llm, embeddings, huggingface };
  }
  
  /**
   * Generate LLM response using Huggingface API
   * @param {string} context The context for the query
   * @param {string} query The user query
   * @param {string} promptTemplate The prompt template to use
   * @returns {Promise<string>} The generated response
   */
  export async function generateHuggingFaceResponse(context, query, promptTemplate) {
    try {
      const modifiedPrompt = promptTemplate.replace("{context}", context).replace("{query}", query);
      const response = await textGeneration({
        accessToken: document.getElementById('apiKey').value,
        model: document.getElementById('huggingFaceModel').value,
        inputs: modifiedPrompt,
        parameters: { max_new_tokens: 50 }
      });
      return response.generated_text;
    } catch (error) {
      console.error("Error:", error);
      return "Error generating response with HuggingFace";
    }
  }