document.getElementById('app').innerHTML = `
  <h2>API Data</h2>
  <div>
    <label for="api-selector">Select API:</label>
    <select id="api-selector">
      <option value="api1">API 1</option>
      <option value="api2">API 2</option>
    </select>
  </div>
  <div id="data-table">
    <!-- Data from API will be displayed here -->
  </div>
`;

document.getElementById('api-selector').addEventListener('change', (e) => {
  const api = e.target.value;
  fetchData(api);
});

function fetchData(api) {
  // You can implement the logic to fetch and display data here
  console.log(`Fetching data for ${api}...`);
}