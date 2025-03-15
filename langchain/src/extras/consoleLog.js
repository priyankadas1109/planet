function consoleLog(text,value) {
  let thetime = (Date.now() - localStart)/1000;
  if (value) {
    console.log((Date.now() - localStart)/1000 + ": " + text, value);
  } else {
    console.log((Date.now() - localStart)/1000 + ": " + text);
  }
  //var dsconsole = document.getElementById("log_display textarea");
  //let dsconsole = document.getElementById("log_display > textarea");
  let dsconsole = document.getElementById("logText");

  if (dsconsole) { // Once in DOM
    //dsconsole.style.display = 'none'; // hidden
    if (consoleLogHolder.length > 0) { // Called only once to display pre-DOM values
      //dsconsole.innerHTML = consoleLogHolder;

      // New alternative to above line, haven't fully tested
      let contentPreDom = document.createTextNode(consoleLogHolder + "DOM NOW AVAILABLE\n");
      dsconsole.appendChild(contentPreDom);

      consoleLogHolder = "";
    }
    dsconsole.style.display = 'block';
    if (value) {
      //dsconsole.innerHTML += (text + " " + value + "\n");
      let content = document.createTextNode(text + " " + value + "\n");
      dsconsole.appendChild(content);

    } else {
      //dsconsole.innerHTML += (text + "\n");
      let content = document.createTextNode(thetime + ": " + text + "\n");
      dsconsole.appendChild(content);
    }
    //dsconsole.scrollTop(dsconsole[0].scrollHeight - dsconsole.height() - 17); // Adjusts for bottom alignment
    dsconsole.scrollTo({ top: dsconsole.scrollHeight, behavior: 'smooth'});

  } else {

    if (value) {
      consoleLogHolder += (text + " " + value + "\n");
    } else {
      consoleLogHolder += (text + "\n");
    }
  }
}