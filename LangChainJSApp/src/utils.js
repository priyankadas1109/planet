import { Document } from "@langchain/core/documents";
/**
 * Function to match the pattern of the github URL
 * @param {*} repoUrl The url of the repository from which to fetch the contents
 * @returns the content of the repository
 */
export async function fetchRepoContentsFromUrl(repoUrl, urlType, githubToken){
    try{
        let contents = [];
        if(urlType == 'repo'){
            const match = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
            if(!match) throw new Error("Invalid GitHub repository URL");
            const owner = match[1];
            const repo = match[2];
            contents = await convertToLangChainDocs(owner, repo, "main", githubToken);
        } else if(urlType == 'folder'){
            const match = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/);
            if (!match) throw new Error("Invalid GitHub folder URL");
            const owner = match[1];
            const repo = match[2];
            const branch = match[3];
            const folderPath = match[4];
            contents = await fetchRepoContents(owner, repo, branch, folderPath, githubToken);
        } else if(urlType == 'single'){
            const match = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/);
            if (!match) throw new Error("Invalid GitHub file URL");
            const owner = match[1];
            const repo = match[2];
            const branch = match[3];
            const filePath = match[4];
            const fileContent = await fetchFileContent(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`);
            contents = [new Document({
                pageContent: fileContent,
                metadata: { source: filePath }
            })];
        }
        return contents; // Return all files
    } catch (error) {
        console.error("Error fetching repository contents:", error);
        return [];
    }
}

/**
 * Function to get the contents of the repository recursively given the owner, repo, branch and token
 * @param {*} owner 
 * @param {*} repo 
 * @param {*} branch 
 * @param {*} path 
 * @param {*} token 
 * @returns A list of jsons containing the contents of the repository
 */
export async function fetchRepoContents(owner, repo, branch, path = "", token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const headers = token ? { Authorization: `token ${token}` } : {};
    
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const items = await response.json();
        let allFiles = [];

        for (const item of items) {
            if (item.type === "file") {
                allFiles.push(item);
            } else if (item.type === "dir") {
                const subfolderFiles = await fetchRepoContents(owner, repo, branch, item.path, token);
                allFiles = allFiles.concat(subfolderFiles);
            }
        }

        return allFiles;
    } catch (error) {
        console.error("Error fetching repository contents:", error);
        return [];
    }
}

/**
 * Method to get the content of the file given the file URL and the token
 * @param {*} fileUrl 
 * @param {*} token 
 * @returns the content of the file
 */
export async function fetchFileContent(fileUrl, token = null) {
    const headers = token ? { Authorization: `token ${token}` } : {};

    try {
        const response = await fetch(fileUrl, { headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.text(); // Get the raw file content as text
    } catch (error) {
        console.error("Error fetching file content:", error);
        return null;
    }
}

/**
 * Method to convert the contents of the repository to the langchain documents
 * @param {*} owner 
 * @param {*} repo 
 * @param {*} branch 
 * @param {*} token 
 * @returns 
 */
export async function convertToLangChainDocs(owner, repo, branch, token = null) {
    const files = await fetchRepoContents(owner, repo, branch, "", token);

    const documents = [];
    for (const file of files) {
        if (file.url) { // Ensure the file has a valid download URL
            const content = await fetchFileContent(file.download_url, token);
            if (content) {
                documents.push(
                    new Document({
                        pageContent: content,
                        metadata: {
                            source: file.path, // Add file path as metadata
                            url: file.html_url, // Optionally add GitHub URL
                        },
                    })
                );
            }
        }
    }

    return documents;
}