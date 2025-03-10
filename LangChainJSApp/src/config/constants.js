// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

// Google Sheets API constants
export const SPREADSHEET_ID = '1jQTlXWom-pXvyP9zuTcbdluyvpb43hu2h7anxhF5qlQ';
export const RANGE = 'A2:J';
export const API_KEY = 'AIzaSyC211F_ub1nAGr2Xv-wJGeulMg4nPzG1yE';

// RAG prompt template
export const RAG_PROMPT = `
  You are an expert assistant answering questions related to the data pulled from a GitHub repository.
  Use the following context to answer the query:

  Context:
  {context}

  Query:
  {query}

  Provide a detailed, accurate response based on the context provided.
  If you're unsure about something, please say so.
  If the question is unrelated to the context, please say that the question is unrelated or something
  along the lines of that
  
  Answer:
`;