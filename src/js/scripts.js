const csvFile = "https://89th.github.io/Rapido/data/ssd.csv";
let allData = []; // Store all the data globally

// Fetch CSV file and process data
fetch(csvFile)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.text();
  })
  .then((csvText) => {
    const rows = csvText
      .trim()
      .split("\n")
      .map((row) => row.split(","));
    rows.shift(); // Remove the header row
    allData = rows; // Store the data globally

    // Populate filters and table
    populateFilters(allData);
    renderTable(allData);

    // Set up event listeners for filters
    const filterElements = ["format", "dram", "type", "interface"];
    filterElements.forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        filterTable();
        updateURL();
      });
    });

    // Search input event listener
    document.getElementById("searchInput").addEventListener("input", () => {
      filterTable();
      updateURL(); // Ensure search term is updated in the URL
    });

    // Reset button event listener
    document
      .getElementById("resetButton")
      .addEventListener("click", resetFilters);

    // Clear search button event listener
    document.getElementById("clearSearch").addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      filterTable(); // Call the filter function to reset the table
      updateURL(); // Ensure the URL is updated when clearing the search
    });

    // Load filters and search term from the URL after data is loaded
    loadFiltersFromURL();
  })
  .catch((error) => {
    console.error("Failed to fetch CSV file:", error);
  });

// Function to populate filters
function populateFilters(data) {
  const formatSet = new Set();
  const typeSet = new Set();
  const interfaceSet = new Set();
  const dramSet = new Set();

  data.forEach((row) => {
    formatSet.add(cleanValue(row[3])); // Format
    typeSet.add(cleanValue(row[2])); // Type
    interfaceSet.add(cleanValue(row[4])); // Interface
    dramSet.add(cleanValue(row[7])); // DRAM
  });

  updateDropdown("format", Array.from(formatSet));
  updateDropdown("type", Array.from(typeSet));
  updateDropdown("interface", Array.from(interfaceSet));
  updateDropdown("dram", Array.from(dramSet));
}

// Function to clean up values (remove unwanted characters)
function cleanValue(value) {
  return value ? value.replace(/[\r\n]+/g, "").trim() : "";
}

// Function to update dropdowns with filter options
function updateDropdown(elementId, options) {
  const select = document.getElementById(elementId);
  select.innerHTML = '<option value="">All</option>'; // Reset dropdown

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
}

// Function to render the table rows
function renderTable(data) {
  const tableBody = document.getElementById("dataTable");
  tableBody.innerHTML = ""; // Clear existing rows

  data.forEach((row) => {
    const tr = document.createElement("tr");

    // Create model cell with link
    const modelCell = createTableCellWithLink(row[0], row[10]);
    tr.appendChild(modelCell);

    // Add remaining table cells
    const columnIndexes = [1, 2, 3, 4, 5, 6, 8, 9, 7]; // Ordered columns
    columnIndexes.forEach((index) => {
      tr.appendChild(createTableCell(row[index]));
    });

    tableBody.appendChild(tr);
  });
}

// Helper function to create a standard table cell
function createTableCell(value) {
  const td = document.createElement("td");
  td.textContent = cleanValue(value);
  return td;
}

// Helper function to create a table cell with a clickable link
function createTableCellWithLink(text, url) {
  const td = document.createElement("td");
  const link = document.createElement("a");
  link.href = cleanValue(url);
  link.textContent = cleanValue(text);
  link.target = "_blank";
  td.appendChild(link);
  return td;
}

// Function to filter the table based on selected filters and search input
function filterTable() {
  const searchTerm = cleanValue(
    document.getElementById("searchInput").value
  ).toLowerCase();
  const format = cleanValue(document.getElementById("format").value);
  const dram = cleanValue(document.getElementById("dram").value);
  const type = cleanValue(document.getElementById("type").value);
  const interfaceValue = cleanValue(document.getElementById("interface").value);

  let filteredData = allData.filter((row) => {
    const modelName = cleanValue(row[0]).toLowerCase(); // Assuming row[0] is Model Name

    // Match the search term from the start of the model name (full word, left to right)
    return (
      (searchTerm === "" || modelName.startsWith(searchTerm)) && // Use startsWith() for full word match
      (format === "" || cleanValue(row[3]) === format) &&
      (dram === "" || cleanValue(row[7]) === dram) &&
      (type === "" || cleanValue(row[2]) === type) &&
      (interfaceValue === "" || cleanValue(row[4]) === interfaceValue)
    );
  });

  // Update dropdowns only if the filter is not selected
  if (format === "") {
    updateDropdown("format", getUniqueOptions(filteredData, 3));
  }
  if (type === "") {
    updateDropdown("type", getUniqueOptions(filteredData, 2));
  }
  if (interfaceValue === "") {
    updateDropdown("interface", getUniqueOptions(filteredData, 4));
  }
  if (dram === "") {
    updateDropdown("dram", getUniqueOptions(filteredData, 7));
  }

  renderTable(filteredData);
}

// Helper function to get unique options for each filter column
function getUniqueOptions(data, columnIndex) {
  const optionSet = new Set();
  data.forEach((row) => {
    optionSet.add(cleanValue(row[columnIndex]));
  });
  return Array.from(optionSet);
}

function resetFilters() {
  document.getElementById("format").value = "";
  document.getElementById("dram").value = "";
  document.getElementById("type").value = "";
  document.getElementById("interface").value = "";
  document.getElementById("searchInput").value = ""; // Clear the search box

  // Re-load all data and reset the table
  renderTable(allData);
  populateFilters(allData);

  // Reset the URL without filters and search term
  window.history.pushState({}, "", window.location.pathname); // Remove filters and search from the URL

  // Ensure the URL is updated
  updateURL(); // This will remove any filters or search term from the URL
}

// Function to update the URL based on selected filter values
function updateURL() {
  const searchTerm = cleanValue(document.getElementById("searchInput").value);
  const format = cleanValue(document.getElementById("format").value);
  const dram = cleanValue(document.getElementById("dram").value);
  const type = cleanValue(document.getElementById("type").value);
  const interfaceValue = cleanValue(document.getElementById("interface").value);

  const urlParams = new URLSearchParams();

  // Always add the search term first if available
  if (searchTerm) urlParams.set("search", searchTerm);

  // Add filters to the URL params
  if (format) urlParams.set("format", format);
  if (dram) urlParams.set("dram", dram);
  if (type) urlParams.set("type", type);
  if (interfaceValue) urlParams.set("interface", interfaceValue);

  // Update the browser URL without reloading the page
  window.history.pushState({}, "", "?" + urlParams.toString());
}

// Function to load filter values from the URL (if any)
function loadFiltersFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  document.getElementById("format").value = urlParams.get("format") || "";
  document.getElementById("dram").value = urlParams.get("dram") || "";
  document.getElementById("type").value = urlParams.get("type") || "";
  document.getElementById("interface").value = urlParams.get("interface") || "";

  // Load the search term from the URL (if any)
  const searchTerm = urlParams.get("search") || "";
  document.getElementById("searchInput").value = searchTerm;

  // Trigger filtering with the loaded search term
  filterTable();
}
