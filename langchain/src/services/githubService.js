// ------------------------------------------------------------
// ENHANCED GITHUB SERVICE
// ------------------------------------------------------------

import { Document } from "@langchain/core/documents";

/**
 * Enhanced GitHub repository service for better RAG integration
 */

/**
 * Fetch repository metadata and statistics
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} token GitHub token
 * @returns {Promise<Object>} Repository metadata
 */
export async function fetchRepositoryMetadata(owner, repo, token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const repoData = await response.json();
    
    return {
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      languages: await fetchRepositoryLanguages(owner, repo, token),
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      size: repoData.size,
      defaultBranch: repoData.default_branch,
      topics: repoData.topics || [],
      license: repoData.license?.name || 'Unknown',
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      homepage: repoData.homepage,
      clonesUrl: repoData.clone_url,
      sshUrl: repoData.ssh_url
    };
  } catch (error) {
    console.error('Error fetching repository metadata:', error);
    return null;
  }
}

/**
 * Fetch repository languages distribution
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} token GitHub token
 * @returns {Promise<Object>} Languages with byte counts
 */
export async function fetchRepositoryLanguages(owner, repo, token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/languages`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching repository languages:', error);
    return {};
  }
}

/**
 * Fetch README content with enhanced parsing
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} token GitHub token
 * @returns {Promise<Document|null>} README as LangChain document
 */
export async function fetchRepositoryReadme(owner, repo, token = null) {
  const possibleReadmes = ['README.md', 'README.rst', 'README.txt', 'README'];
  
  for (const readmeName of possibleReadmes) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${readmeName}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        const content = atob(data.content);
        
        return new Document({
          pageContent: content,
          metadata: {
            source: readmeName,
            type: 'readme',
            repository: `${owner}/${repo}`,
            url: data.html_url,
            size: data.size
          }
        });
      }
    } catch (error) {
      console.log(`README ${readmeName} not found, trying next...`);
    }
  }
  
  return null;
}

/**
 * Enhanced repository content fetching with smart filtering
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} branch Branch name
 * @param {string} path Path within repository
 * @param {string} token GitHub token
 * @param {Object} options Filtering and processing options
 * @returns {Promise<Array>} Array of LangChain documents
 */
export async function fetchEnhancedRepositoryContents(owner, repo, branch = 'main', path = '', token = null, options = {}) {
  const {
    maxFileSize = 1024 * 1024, // 1MB max per file
    includePatterns = [
      /\.(md|txt|json|yaml|yml|py|js|ts|jsx|tsx|java|cpp|c|cs|go|rs|rb|php|swift|kt|scala|sh|bat)$/i,
      /^(README|LICENSE|CHANGELOG|CONTRIBUTING|CODE_OF_CONDUCT|SECURITY)(\.|$)/i
    ],
    excludePatterns = [
      /node_modules|\.git|\.vscode|\.idea|__pycache__|\.pytest_cache|\.coverage|dist|build|target/,
      /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|7z|exe|dll|so|dylib)$/i
    ],
    maxFiles = 200
  } = options;

  try {
    const allFiles = await fetchRepositoryContentsRecursive(owner, repo, branch, path, token);
    const filteredFiles = filterFiles(allFiles, includePatterns, excludePatterns, maxFiles);
    
    console.log(`Processing ${filteredFiles.length} files out of ${allFiles.length} total files`);
    
    const documents = [];
    const metadata = await fetchRepositoryMetadata(owner, repo, token);
    
    // Add repository metadata as a document
    if (metadata) {
      documents.push(new Document({
        pageContent: `Repository: ${metadata.fullName}
Description: ${metadata.description || 'No description'}
Language: ${metadata.language || 'Multiple'}
Stars: ${metadata.stars}
License: ${metadata.license}
Topics: ${metadata.topics.join(', ')}
Homepage: ${metadata.homepage || 'None'}
Created: ${metadata.createdAt}
Last Updated: ${metadata.updatedAt}

Languages Distribution:
${Object.entries(metadata.languages).map(([lang, bytes]) => `- ${lang}: ${(bytes / 1024).toFixed(1)}KB`).join('\n')}`,
        metadata: {
          source: 'repository-metadata',
          type: 'metadata',
          repository: metadata.fullName,
          branch: branch
        }
      }));
    }
    
    // Add README as priority document
    const readme = await fetchRepositoryReadme(owner, repo, token);
    if (readme) {
      documents.push(readme);
    }
    
    // Process filtered files
    for (const file of filteredFiles) {
      try {
        if (file.size > maxFileSize) {
          console.log(`Skipping large file: ${file.path} (${(file.size / 1024).toFixed(1)}KB)`);
          continue;
        }
        
        const content = await fetchFileContentWithRetry(file.download_url, token);
        if (content) {
          const decodedContent = file.encoding === 'base64' ? atob(content.content || content) : content;
          
          // Enhanced metadata
          const doc = new Document({
            pageContent: decodedContent,
            metadata: {
              source: file.path,
              type: getFileType(file.path),
              repository: `${owner}/${repo}`,
              branch: branch,
              size: file.size,
              url: file.html_url,
              language: getLanguageFromExtension(file.path),
              directory: file.path.split('/').slice(0, -1).join('/') || 'root'
            }
          });
          
          documents.push(doc);
        }
      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error);
      }
    }
    
    console.log(`Successfully processed ${documents.length} documents`);
    return documents;
    
  } catch (error) {
    console.error('Error in enhanced repository fetch:', error);
    return [];
  }
}

/**
 * Recursively fetch all repository contents
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} branch Branch name
 * @param {string} path Current path
 * @param {string} token GitHub token
 * @returns {Promise<Array>} Array of file objects
 */
async function fetchRepositoryContentsRecursive(owner, repo, branch, path = '', token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const items = await response.json();
    let allFiles = [];

    for (const item of items) {
      if (item.type === 'file') {
        allFiles.push(item);
      } else if (item.type === 'dir') {
        const subFiles = await fetchRepositoryContentsRecursive(owner, repo, branch, item.path, token);
        allFiles = allFiles.concat(subFiles);
      }
    }

    return allFiles;
  } catch (error) {
    console.error(`Error fetching contents for path ${path}:`, error);
    return [];
  }
}

/**
 * Filter files based on patterns and limits
 * @param {Array} files Array of file objects
 * @param {Array} includePatterns Regex patterns to include
 * @param {Array} excludePatterns Regex patterns to exclude
 * @param {number} maxFiles Maximum number of files
 * @returns {Array} Filtered array of files
 */
function filterFiles(files, includePatterns, excludePatterns, maxFiles) {
  let filtered = files.filter(file => {
    // Check exclude patterns first
    for (const pattern of excludePatterns) {
      if (pattern.test(file.path)) {
        return false;
      }
    }
    
    // Check include patterns
    for (const pattern of includePatterns) {
      if (pattern.test(file.path)) {
        return true;
      }
    }
    
    return false;
  });
  
  // Sort by priority: README first, then by file type, then alphabetically
  filtered.sort((a, b) => {
    const aIsReadme = /readme/i.test(a.name);
    const bIsReadme = /readme/i.test(b.name);
    
    if (aIsReadme && !bIsReadme) return -1;
    if (!aIsReadme && bIsReadme) return 1;
    
    const aType = getFileType(a.path);
    const bType = getFileType(b.path);
    
    if (aType !== bType) {
      const priority = { 'documentation': 0, 'config': 1, 'source': 2, 'other': 3 };
      return (priority[aType] || 3) - (priority[bType] || 3);
    }
    
    return a.path.localeCompare(b.path);
  });
  
  return filtered.slice(0, maxFiles);
}

/**
 * Fetch file content with retry logic
 * @param {string} fileUrl File download URL
 * @param {string} token GitHub token
 * @param {number} maxRetries Maximum retry attempts
 * @returns {Promise<string|null>} File content
 */
async function fetchFileContentWithRetry(fileUrl, token = null, maxRetries = 3) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(fileUrl, { headers });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const content = await response.text();
      return content;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed to fetch file after ${maxRetries} attempts:`, error);
        return null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
}

/**
 * Determine file type based on path
 * @param {string} filePath File path
 * @returns {string} File type category
 */
function getFileType(filePath) {
  const fileName = filePath.toLowerCase();
  
  if (/\.(md|txt|rst|org)$/.test(fileName) || /^(readme|changelog|contributing|license)/i.test(fileName)) {
    return 'documentation';
  }
  
  if (/\.(json|yaml|yml|toml|ini|cfg|conf|env)$/.test(fileName) || /^(\.|\w+rc$|makefile|dockerfile)/i.test(fileName)) {
    return 'config';
  }
  
  if (/\.(py|js|ts|jsx|tsx|java|cpp|c|cs|go|rs|rb|php|swift|kt|scala|sh|bat)$/.test(fileName)) {
    return 'source';
  }
  
  return 'other';
}

/**
 * Get programming language from file extension
 * @param {string} filePath File path
 * @returns {string} Programming language
 */
function getLanguageFromExtension(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap = {
    'py': 'Python',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'jsx': 'React JSX',
    'tsx': 'React TSX',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'go': 'Go',
    'rs': 'Rust',
    'rb': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'sh': 'Shell',
    'bat': 'Batch',
    'md': 'Markdown',
    'json': 'JSON',
    'yaml': 'YAML',
    'yml': 'YAML',
    'toml': 'TOML',
    'xml': 'XML',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass'
  };
  
  return languageMap[ext] || 'Unknown';
}

/**
 * Generate repository summary for RAG context
 * @param {Array} documents Array of processed documents
 * @returns {string} Repository summary
 */
export function generateRepositorySummary(documents) {
  if (!documents || documents.length === 0) {
    return 'No repository data available.';
  }
  
  const metadataDoc = documents.find(doc => doc.metadata.type === 'metadata');
  const readmeDoc = documents.find(doc => doc.metadata.type === 'readme');
  const sourceFiles = documents.filter(doc => doc.metadata.type === 'source');
  const configFiles = documents.filter(doc => doc.metadata.type === 'config');
  const docFiles = documents.filter(doc => doc.metadata.type === 'documentation');
  
  let summary = '';
  
  if (metadataDoc) {
    summary += `${metadataDoc.pageContent}\n\n`;
  }
  
  summary += `📊 Repository Analysis:
- Total files analyzed: ${documents.length}
- Source code files: ${sourceFiles.length}
- Configuration files: ${configFiles.length}
- Documentation files: ${docFiles.length}

🗂️ File Structure:
${documents.slice(0, 10).map(doc => `- ${doc.metadata.source} (${doc.metadata.language || doc.metadata.type})`).join('\n')}
${documents.length > 10 ? `... and ${documents.length - 10} more files` : ''}

`;

  if (readmeDoc) {
    summary += `📖 README Summary:
${readmeDoc.pageContent.substring(0, 500)}${readmeDoc.pageContent.length > 500 ? '...' : ''}\n\n`;
  }
  
  // Add language distribution
  const languages = {};
  documents.forEach(doc => {
    const lang = doc.metadata.language;
    if (lang && lang !== 'Unknown') {
      languages[lang] = (languages[lang] || 0) + 1;
    }
  });
  
  if (Object.keys(languages).length > 0) {
    summary += `💻 Programming Languages:
${Object.entries(languages)
  .sort(([,a], [,b]) => b - a)
  .map(([lang, count]) => `- ${lang}: ${count} files`)
  .join('\n')}`;
  }
  
  return summary;
} 