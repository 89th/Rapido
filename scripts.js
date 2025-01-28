const csvFile = "ssd.csv";

// Fetch CSV file and process data
fetch(csvFile)
  .then((response) => response.text())
  .then((csvText) => {
    const rows = csvText
      .trim()
      .split("\n")
      .map((row) => row.split(","));
    const headers = rows.shift(); // Extract the header row
    const data = rows; // Remaining rows are data

    // Populate the filters and table
    populateFilters(data);
    renderTable(data);

    // Set up event listeners for filters
    document.getElementById("format").addEventListener("change", () => {
      filterTable(data);
      updateURL();
    });
    document.getElementById("dram").addEventListener("change", () => {
      filterTable(data);
      updateURL();
    });
    document.getElementById("type").addEventListener("change", () => {
      filterTable(data);
      updateURL();
    });
    document.getElementById("interface").addEventListener("change", () => {
      filterTable(data);
      updateURL();
    });

    // Reset button event listener
    document
      .getElementById("resetButton")
      .addEventListener("click", resetFilters);
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

  // Load filter values from URL (if available)
  loadFiltersFromURL();
}

// Function to clean up values (remove unwanted characters)
function cleanValue(value) {
  return value.replace(/[\r\n]+/g, "").trim();
}

// Function to update dropdowns with filter options
function updateDropdown(elementId, options) {
  const select = document.getElementById(elementId);
  if (select.value === "") {
    select.innerHTML = '<option value="">All</option>'; // Reset dropdown
    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
  }
}

// Function to render the table rows
function renderTable(data) {
  const tableBody = document.getElementById("dataTable");
  tableBody.innerHTML = ""; // Clear existing rows
  data.forEach((row) => {
    const tr = document.createElement("tr");

    const modelCell = document.createElement("td");
    const modelLink = document.createElement("a");
    modelLink.href = cleanValue(row[8]); // Assuming row[8] is the Product URL
    modelLink.textContent = cleanValue(row[0]); // Assuming row[0] is the Model Name
    modelLink.target = "_blank";
    modelCell.appendChild(modelLink);
    tr.appendChild(modelCell);

    row.slice(1, 8).forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cleanValue(cell);
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

// Function to filter the table based on selected filters
function filterTable(data) {
  const format = cleanValue(document.getElementById("format").value);
  const dram = cleanValue(document.getElementById("dram").value);
  const type = cleanValue(document.getElementById("type").value);
  const interfaceValue = cleanValue(document.getElementById("interface").value);

  let filteredData = data.filter((row) => {
    return (
      (format === "" || cleanValue(row[3]) === format) &&
      (dram === "" || cleanValue(row[7]) === dram) &&
      (type === "" || cleanValue(row[2]) === type) &&
      (interfaceValue === "" || cleanValue(row[4]) === interfaceValue)
    );
  });

  updateDropdown("format", getUniqueOptions(filteredData, 3));
  updateDropdown("type", getUniqueOptions(filteredData, 2));
  updateDropdown("interface", getUniqueOptions(filteredData, 4));
  updateDropdown("dram", getUniqueOptions(filteredData, 7));

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

// Function to reset all filters to their default state
function resetFilters() {
  document.getElementById("format").value = "";
  document.getElementById("dram").value = "";
  document.getElementById("type").value = "";
  document.getElementById("interface").value = "";

  fetch(csvFile)
    .then((response) => response.text())
    .then((csvText) => {
      const rows = csvText
        .trim()
        .split("\n")
        .map((row) => row.split(","));
      rows.shift(); // Remove header
      populateFilters(rows);
      renderTable(rows);
    });

  // Reset the URL without filters
  window.history.pushState({}, "", window.location.pathname);
}

// Function to update the URL based on selected filter values
function updateURL() {
  const format = cleanValue(document.getElementById("format").value);
  const dram = cleanValue(document.getElementById("dram").value);
  const type = cleanValue(document.getElementById("type").value);
  const interfaceValue = cleanValue(document.getElementById("interface").value);

  const urlParams = new URLSearchParams();

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
}
