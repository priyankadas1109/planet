# Planet Langchain

View our [interface development](trade)  
Click: Document Source > Feed API

Install dependencies, including Vite, into the node_modules folder:

	npm install

To build to trade folder, run:

	npm run build

View in your webroot. [Cmd to turn on your webroot](https://dreamstudio.com/localsite/start/steps/).

### Projects

TO DO: When embedding, there's currently an error:  

	Cannot read properties of null (reading 'addEventListener')
    at layout.js:649:4297

Here's a stripped-down [test page](test.html) for debugging embedding.  
Maybe you could turn off minifying to see line 649.